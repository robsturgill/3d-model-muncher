let fetchFn = null;
try {
  // Prefer node-fetch for older Node versions
  // eslint-disable-next-line global-require
  const nf = require('node-fetch');
  fetchFn = nf.default || nf;
} catch (e) {
  // If node-fetch isn't installed, try global fetch (Node 18+)
  if (typeof global.fetch === 'function') {
    fetchFn = global.fetch.bind(global);
  } else if (typeof fetch === 'function') {
    fetchFn = fetch;
  } else {
    fetchFn = null;
  }
}

const safeLog = (msg, obj) => console.log(msg, obj || '');

// Default system instruction used when caller doesn't provide a custom systemPrompt.
// This prompt is conditional: it instructs the model to prefer the image when present,
// otherwise use filename/title for subject/theme context. It also mandates the output
// format the frontend expects.
const DEFAULT_SYSTEM_PROMPT = `You are an AI that generates concise product descriptions for 3D printed models based on available context.
If an image is provided, use the image to infer the object's purpose and style. If no image is available, use the filename or title for subject/theme context (use filename only for subject/theme hints).
Focus descriptions on the purpose, functionality, and style of the object.

RESPOND ONLY WITH A JSON OBJECT (no surrounding text) with these exact keys:
- description: a string containing a short paragraph (2–3 sentences) that clearly describes the object's purpose, functionality, and style.
- category: a single word string suitable for organizing the model.
- tags: an array of 4 to 6 short tag strings (no spaces in tags if possible; use hyphens to join words).

The JSON must be parseable by a strict JSON parser. Do NOT include any additional keys, commentary, or explanation. Do NOT mention the phrases "image of", "3D printed", or "3D model of". Keep the tone clear, simple, and descriptive.`;

/**
 * Simple GenAI adapter supporting providers via environment.
 * - If GEMINI_PROVIDER is 'openai', uses OpenAI's completions/response API.
 * - Otherwise, no network call is made and the caller should fallback to mock.
 *
 * The adapter is intentionally small and returns a normalized { description, category, tags }
 * shape that the frontend expects.
 */
// Note: client-supplied systemPrompt is intentionally ignored to prevent users
// from overriding the internal system instruction which enforces consistent
// output structure and content rules. The adapter will always use
// `DEFAULT_SYSTEM_PROMPT` when building provider requests.
async function suggest({ prompt, imageBase64, mimeType, systemPrompt, provider = process.env.GEMINI_PROVIDER }) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt required');
  }

  // Provider: OpenAI (text completion / responses)
  if (provider && provider.toLowerCase() === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not configured');

    // Build a lightweight request: use the responses endpoint if available, otherwise fallback
    const url = 'https://api.openai.com/v1/chat/completions';

  // Always enforce the DEFAULT_SYSTEM_PROMPT; ignore any client-provided value.
  const system = DEFAULT_SYSTEM_PROMPT;
    const user = `Prompt: ${prompt}\nReturn JSON with keys: description (string), category (single word), tags (array of strings).`;

    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 300,
      temperature: 0.6
    };

    if (!fetchFn) throw new Error('No fetch implementation available (install node-fetch or use Node 18+)');

    const resp = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      safeLog('OpenAI error', { status: resp.status, body: txt });
      throw new Error('OpenAI API error: ' + resp.status);
    }

    const parsed = await resp.json();
    // Try to read assistant reply text
    const reply = (parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) || parsed.choices && parsed.choices[0] && parsed.choices[0].text;

    // Attempt to extract JSON from reply
    let json = null;
    try {
      const firstBrace = reply.indexOf('{');
      const lastBrace = reply.lastIndexOf('}');
      const candidate = firstBrace >= 0 && lastBrace > firstBrace ? reply.substring(firstBrace, lastBrace + 1) : reply;
      json = JSON.parse(candidate);
    } catch (e) {
      // fallback heuristic: build suggestion from reply text
      json = { description: reply || '', category: '', tags: [] };
    }

    return {
      description: json.description || '',
      category: json.category || '',
      tags: Array.isArray(json.tags) ? json.tags.slice(0, 6) : [] ,
      raw: parsed
    };
  }

  // Provider: Google Gemini (Generative Models API)
  if (provider && provider.toLowerCase() === 'gemini') {
    // Load dotenv if available so local .env values are picked up in dev
    try { require('dotenv').config(); } catch (e) { /* noop */ }

    const key = process.env.GOOGLE_API_KEY;
    if (!key && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS required for gemini provider');

    // Prefer the official @google/genai client. If it's not available or fails, return null
    // so the server will fall back to the mock suggestion behavior.
    try {
      const { GoogleGenAI } = require('@google/genai');
      const clientOpts = {};
      if (process.env.GOOGLE_API_KEY) clientOpts.apiKey = process.env.GOOGLE_API_KEY;
      const ai = new GoogleGenAI(clientOpts);

      const contents = [];
  // Include the enforced system instruction as the first content item (client-supplied systemPrompt is ignored)
  const sys = DEFAULT_SYSTEM_PROMPT;
      if (sys) contents.push({ text: sys });
      if (imageBase64) contents.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } });
      contents.push({ text: prompt });

      const modelName = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({ model: modelName, contents });

      // Normalize reply text
      let reply = '';
      if (typeof response.text === 'string' && response.text.trim()) reply = response.text;
      else if (response?.results && Array.isArray(response.results) && response.results[0]) {
        const r = response.results[0];
        if (r?.content && Array.isArray(r.content)) reply = r.content.map(c => c.text || '').join('\n');
        else if (r?.text) reply = r.text;
      } else if (response?.candidates && response.candidates[0] && response.candidates[0].content) reply = response.candidates[0].content;

      // Attempt to parse JSON from reply
      let json = null;
      try {
        const firstBrace = reply.indexOf('{');
        const lastBrace = reply.lastIndexOf('}');
        const candidate = firstBrace >= 0 && lastBrace > firstBrace ? reply.substring(firstBrace, lastBrace + 1) : reply;
        json = JSON.parse(candidate);
      } catch (e) {
        json = { description: reply || '', category: '', tags: [] };
      }

      return {
        description: json.description || '',
        category: json.category || '',
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 6) : [],
        raw: response
      };
    } catch (clientErr) {
      safeLog('Google genai client not available or failed; falling back to mock (server will handle it)', { message: clientErr && clientErr.message });
      return null;
    }
  }

  // No provider configured
  return null;
}

module.exports = { suggest };
