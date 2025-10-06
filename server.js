// Simple Express server for 3D Model Muncher backend API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const multer = require('multer');
try { require('dotenv').config(); } catch (e) { /* dotenv not installed or not needed in production */ }
const { scanDirectory } = require('./dist-backend/utils/threeMFToJson');
const { ConfigManager } = require('./dist-backend/utils/configManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Startup diagnostic: show which GenAI env vars are present (sanitized)
safeLog('GenAI env presence:', {
  GEMINI_PROVIDER: !!process.env.GEMINI_PROVIDER,
  GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
  OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
});

// Helper: sanitize objects before logging to avoid dumping large base64 images
function sanitizeForLog(value, options = {}) {
  const maxStringLength = options.maxStringLength || 200; // truncate long strings
  const base64Pattern = /^(data:\w+\/[\w+.-]+;base64,)?[A-Za-z0-9+/=\s]{200,}$/; // heuristic

  function sanitize(v, seen = new Set()) {
    if (v == null) return v;
    if (typeof v === 'string') {
      // If looks like base64 or very long, truncate and replace
      const trimmed = v.trim();
      if (trimmed.length > maxStringLength || base64Pattern.test(trimmed)) {
        return trimmed.substring(0, 64) + '...[TRUNCATED ' + trimmed.length + ' chars]';
      }
      return v;
    }
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) {
      return v.map(i => sanitize(i, seen));
    }
    if (typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      const out = {};
      for (const k of Object.keys(v)) {
        // Skip very large keys that commonly contain image data
        if (/(thumbnail|image|data|base64)/i.test(k) && typeof v[k] === 'string') {
          const s = v[k].trim();
          if (s.length > 40 || base64Pattern.test(s)) {
            out[k] = '[BASE64 TRUNCATED ' + s.length + ' chars]';
            continue;
          }
        }
        out[k] = sanitize(v[k], seen);
      }
      return out;
    }
    return v;
  }

  try {
    return sanitize(value);
  } catch (e) {
    return '[Unable to sanitize]';
  }
}

function safeLog(...args) {
  const sanitized = args.map(a => {
    if (typeof a === 'object' && a !== null) return sanitizeForLog(a);
    if (typeof a === 'string' && a.length > 400) return a.substring(0, 200) + '...[TRUNCATED ' + a.length + ' chars]';
    return a;
  });
  console.log.apply(console, sanitized);
}

// Helper: conditional debug logging controlled by server-side config (data/config.json)
function isServerDebugEnabled() {
  try {
    const cfgPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      return !!(parsed && parsed.settings && parsed.settings.verboseScanLogs);
    }
  } catch (e) {
    // ignore parse/read errors and fall back
  }
  try {
    const cfg = ConfigManager.loadConfig();
    return !!(cfg && cfg.settings && cfg.settings.verboseScanLogs);
  } catch (e) {
    return false;
  }
}

function serverDebug(...args) {
  if (isServerDebugEnabled()) {
    const sanitized = args.map(a => (typeof a === 'object' && a !== null) ? sanitizeForLog(a) : a);
    console.debug.apply(console, sanitized);
  }
}

// Configure multer for backup file uploads
// Increase fileSize limit to support larger model files (1GB by default)
// This can be overridden with the environment variable MAX_UPLOAD_BYTES (bytes)
const MAX_UPLOAD_BYTES = process.env.MAX_UPLOAD_BYTES ? parseInt(process.env.MAX_UPLOAD_BYTES, 10) : (1 * 1024 * 1024 * 1024);
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES } // configurable via env MAX_UPLOAD_BYTES
});

app.use(cors());
app.use(express.json({ limit: '100mb' })); // Increased limit for large model payloads

// Collections storage helpers (persist under data/collections.json)
const collectionsFilePath = path.join(process.cwd(), 'data', 'collections.json');

function loadCollections() {
  try {
    if (!fs.existsSync(collectionsFilePath)) return [];
    const raw = fs.readFileSync(collectionsFilePath, 'utf8');
    if (!raw || raw.trim() === '') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.collections) ? parsed.collections : []);
  } catch (e) {
    console.warn('Failed to load collections.json:', e);
    return [];
  }
}

function saveCollections(collections) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const tmp = collectionsFilePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(collections, null, 2), 'utf8');
    fs.renameSync(tmp, collectionsFilePath);
    return true;
  } catch (e) {
    console.error('Failed to save collections.json:', e);
    return false;
  }
}

function makeId(prefix = 'col') {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${ts}-${rnd}`;
}

// Health check endpoint for Docker/Unraid
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0'
  });
});

// --- Collections API ---
// List all collections
app.get('/api/collections', (req, res) => {
  try {
    const cols = loadCollections();
    res.json({ success: true, collections: cols });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load collections' });
  }
});

// Create or update a collection
app.post('/api/collections', (req, res) => {
  try {
    const { id, name, description = '', modelIds = [], coverModelId, category = '', tags = [], images = [] } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!Array.isArray(modelIds)) {
      return res.status(400).json({ success: false, error: 'modelIds must be an array' });
    }

    const now = new Date().toISOString();
    const normalizedIds = Array.from(new Set(modelIds.filter(x => typeof x === 'string' && x.trim() !== '')));

    const cols = loadCollections();
    let result;
    if (id) {
      const idx = cols.findIndex(c => c.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Collection not found' });
      }
      const updated = { ...cols[idx], name, description, modelIds: normalizedIds, coverModelId, lastModified: now };
      if (typeof category === 'string') updated.category = category;
      if (Array.isArray(tags)) updated.tags = Array.from(new Set(tags.filter(t => typeof t === 'string')));
      if (Array.isArray(images)) updated.images = images.filter(s => typeof s === 'string');
      cols[idx] = updated;
      if (!saveCollections(cols)) return res.status(500).json({ success: false, error: 'Failed to save collection' });
      result = updated;
    } else {
      const newCol = { id: makeId(), name, description, modelIds: normalizedIds, coverModelId, category, tags: Array.isArray(tags) ? Array.from(new Set(tags.filter(t => typeof t === 'string'))) : [], images: Array.isArray(images) ? images.filter(s => typeof s === 'string') : [], created: now, lastModified: now };
      cols.push(newCol);
      if (!saveCollections(cols)) return res.status(500).json({ success: false, error: 'Failed to save collection' });
      result = newCol;
    }
    res.json({ success: true, collection: result });
  } catch (e) {
    console.error('/api/collections error:', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete a collection
app.delete('/api/collections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cols = loadCollections();
    const idx = cols.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
    const removed = cols.splice(idx, 1)[0];
    if (!saveCollections(cols)) return res.status(500).json({ success: false, error: 'Failed to save collections' });
    res.json({ success: true, deleted: removed });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Serve model files from the models directory. The configured directory can be
// updated at runtime by saving `data/config.json`. We create a small wrapper
// that ensures the static handler points at the current configured directory.
let currentModelsStaticHandler = null;
let currentModelsPath = null;

function ensureModelsStaticHandler() {
  try {
    const abs = getAbsoluteModelsPath();
    if (currentModelsPath !== abs) {
      console.log(`Updating /models static handler to serve from: ${abs}`);
      currentModelsPath = abs;
      currentModelsStaticHandler = express.static(abs);
    }
  } catch (e) {
    console.warn('Failed to ensure models static handler:', e);
    currentModelsStaticHandler = (req, res, next) => next();
  }
}

app.use('/models', (req, res, next) => {
  ensureModelsStaticHandler();
  return currentModelsStaticHandler(req, res, next);
});

// Helper function to get the models directory (always from source)
function getModelsDirectory() {
  // Prefer server-side `data/config.json` when present (written by /api/save-config).
  try {
    const serverConfigPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(serverConfigPath)) {
      const raw = fs.readFileSync(serverConfigPath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      if (parsed && parsed.settings && typeof parsed.settings.modelDirectory === 'string' && parsed.settings.modelDirectory.trim() !== '') {
        return parsed.settings.modelDirectory;
      }
    }
  } catch (e) {
    console.warn('Failed to read server-side data/config.json:', e);
  }
  const config = ConfigManager.loadConfig();
  return (config.settings && config.settings.modelDirectory) || './models';
}

function getAbsoluteModelsPath() {
  const dir = getModelsDirectory();
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

// Helper to ensure we never write directly to .3mf or .stl files. If a caller
// provides a target path that points at a model file, map it to the
// corresponding munchie JSON filename instead and return that path. This
// centralizes the protection so restore/upload code won't accidentally
// overwrite raw model files.
function protectModelFileWrite(targetPath) {
  try {
    if (!targetPath || typeof targetPath !== 'string') return targetPath;
    if (/\.3mf$/i.test(targetPath)) {
      const mapped = targetPath.replace(/\.3mf$/i, '-munchie.json');
      console.warn('Attempted write to .3mf detected; remapping to munchie JSON:', targetPath, '->', mapped);
      return mapped;
    }
    if (/\.stl$/i.test(targetPath)) {
      const mapped = targetPath.replace(/\.stl$/i, '-stl-munchie.json');
      console.warn('Attempted write to .stl detected; remapping to -stl-munchie JSON:', targetPath, '->', mapped);
      return mapped;
    }
  } catch (e) {
    // If anything goes wrong, fall back to returning original so caller can
    // make a final decision; avoid throwing here to not break restore flows.
    console.warn('protectModelFileWrite error:', e && e.message ? e.message : e);
  }
  return targetPath;
}

  // Helper: ensure munchie JSON has userDefined.thumbnail and imageOrder when appropriate
async function postProcessMunchieFile(absoluteFilePath) {
  try {
    if (!fs.existsSync(absoluteFilePath)) return;
    const raw = fs.readFileSync(absoluteFilePath, 'utf8');
    if (!raw || raw.trim().length === 0) return;
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    const parsedImages = Array.isArray(data.parsedImages) ? data.parsedImages : (Array.isArray(data.images) ? data.images : []);
  // Normalize legacy userDefined shapes:
  // - array (old generator produced [ { ... } ])
  // - object that contains numeric keys like '0' (previous saves produced object with '0')
  let changed = false;
  let udExists = data.userDefined && typeof data.userDefined === 'object';
  try {
    if (Array.isArray(data.userDefined)) {
      // Convert array -> single object using first entry
      data.userDefined = data.userDefined.length > 0 && typeof data.userDefined[0] === 'object' ? { ...(data.userDefined[0]) } : {};
      udExists = true;
      changed = true;
    } else if (udExists && Object.prototype.hasOwnProperty.call(data.userDefined, '0')) {
      // Convert object with numeric '0' key into normal object shape
      const zero = data.userDefined['0'] && typeof data.userDefined['0'] === 'object' ? { ...(data.userDefined['0']) } : {};
      // preserve any top-level fields (images, thumbnail, imageOrder) that exist
      const imgs = Array.isArray(data.userDefined.images) ? data.userDefined.images : undefined;
      const thumb = typeof data.userDefined.thumbnail !== 'undefined' ? data.userDefined.thumbnail : undefined;
      const order = Array.isArray(data.userDefined.imageOrder) ? data.userDefined.imageOrder : undefined;
      const normalized = { ...zero };
      if (typeof imgs !== 'undefined') normalized.images = imgs;
      if (typeof thumb !== 'undefined') normalized.thumbnail = thumb;
      if (typeof order !== 'undefined') normalized.imageOrder = order;
      data.userDefined = normalized;
      udExists = true;
      changed = true;
    }
  } catch (e) {
    // if normalization fails, don't block post-processing
    console.warn('Failed to normalize legacy userDefined shape:', e);
  }

    if (parsedImages && parsedImages.length > 0) {
      // Ensure userDefined object exists
      if (!udExists) {
        data.userDefined = {};
        changed = true;
      }
      // Ensure thumbnail descriptor exists
      if (!data.userDefined.thumbnail) {
        data.userDefined.thumbnail = 'parsed:0';
        changed = true;
      }
      // Ensure imageOrder exists and lists parsed images first
      if (!Array.isArray(data.userDefined.imageOrder) || data.userDefined.imageOrder.length === 0) {
        const imageOrder = [];
        for (let i = 0; i < parsedImages.length; i++) imageOrder.push(`parsed:${i}`);
        const userImgs = Array.isArray(data.userDefined.images) ? data.userDefined.images : [];
        for (let i = 0; i < userImgs.length; i++) imageOrder.push(`user:${i}`);
        data.userDefined.imageOrder = imageOrder;
        changed = true;
      }
    }

    if (changed) {
      // Protect against accidental writes to raw model files
      const safeTarget = protectModelFileWrite(absoluteFilePath);
      const tmpPath = safeTarget + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpPath, safeTarget);
      console.log('Post-processed munchie file to include userDefined.thumbnail/imageOrder:', safeTarget);
    }
  } catch (e) {
    console.warn('postProcessMunchieFile error for', absoluteFilePath, e);
  }
}

// API endpoint to save a model to its munchie.json file
app.post('/api/save-model', async (req, res) => {
  let { filePath, id, ...changes } = req.body || {};

  // Require at least an id or a filePath so we know where to save
  if (!filePath && !id) {
    console.log('No filePath or id provided');
    return res.status(400).json({ success: false, error: 'No filePath or id provided' });
  }

  // If filePath is a model file (.stl/.3mf), convert to munchie.json
  if (filePath && (filePath.endsWith('.stl') || filePath.endsWith('.STL'))) {
    filePath = filePath.replace(/\.stl$/i, '-stl-munchie.json').replace(/\.STL$/i, '-stl-munchie.json');
  } else if (filePath && filePath.endsWith('.3mf')) {
    filePath = filePath.replace(/\.3mf$/i, '-munchie.json');
  }

  // Refuse to write to raw model files
  if (filePath && (filePath.endsWith('.stl') || filePath.endsWith('.3mf'))) {
    console.error('Refusing to write to model file:', filePath);
    return res.status(400).json({ success: false, error: 'Refusing to write to model file' });
  }
  try {
    // If an id was provided without a filePath, try to locate the munchie JSON file by scanning the models directory
    let absoluteFilePath;
    if (!filePath && id) {
      try {
        const modelsRoot = getAbsoluteModelsPath();
        let found = null;
        function walk(dir) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (found) break;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
              try {
                const raw = fs.readFileSync(full, 'utf8');
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed && (parsed.id === id || parsed.name === id)) {
                  found = full;
                  break;
                }
              } catch (e) {
                // ignore parse errors for individual files
              }
            }
          }
        }
        walk(modelsRoot);
        if (!found) {
          return res.status(404).json({ success: false, error: 'Model id not found' });
        }
        absoluteFilePath = found;
        // populate filePath (relative) for logging and downstream use
        filePath = path.relative(modelsRoot, found).replace(/\\/g, '/');
      } catch (e) {
        console.error('Error searching for munchie by id:', e);
        return res.status(500).json({ success: false, error: 'Internal error locating model by id' });
      }
      } else {
        // Resolve provided filePath to absolute path
        if (path.isAbsolute(filePath)) {
          absoluteFilePath = filePath;
        } else {
          absoluteFilePath = path.join(getAbsoluteModelsPath(), filePath);
        }
      }

    console.log('Resolved file path for saving:', absoluteFilePath);

    // Require relative filePath and ensure the target is inside the configured models directory
    if (path.isAbsolute(filePath) && !(filePath && filePath.startsWith('./') === false)) {
      // If the client sent an absolute filePath string, reject it outright for safety
      console.warn('Rejected absolute filePath in /api/save-model:', filePath);
      return res.status(400).json({ success: false, error: 'Absolute file paths are not allowed' });
    }

    try {
      const resolvedTarget = path.resolve(absoluteFilePath);
      const modelsDirResolved = path.resolve(getAbsoluteModelsPath());
      const relative = path.relative(modelsDirResolved, resolvedTarget);
      if (relative.startsWith('..') || (relative === '' && resolvedTarget !== modelsDirResolved)) {
        console.warn('Attempt to save model outside models directory blocked:', resolvedTarget, 'relativeToModelsDir=', relative);
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    } catch (e) {
      console.error('Error resolving paths for save-model containment check:', e);
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }
    
    // Load existing model JSON (be defensive against corrupt or partial files)
    let existing = {};
    if (fs.existsSync(absoluteFilePath)) {
      try {
        const raw = fs.readFileSync(absoluteFilePath, 'utf-8');
        existing = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        console.error(`Failed to parse existing model JSON at ${absoluteFilePath}:`, parseErr);
        // If file is corrupted or partially written, continue with an empty object so we can
        // overwrite with a clean, valid JSON. Do NOT hard-fail here to avoid blocking UI actions.
        existing = {};
      }
    }

    // Migration: if an existing file accidentally contains a top-level `changes` object
    // (caused by the previous API mismatch where the client sent { filePath, changes: {...} }),
    // merge that object into the top-level and remove the wrapper so the file doesn't
    // continue to contain a "changes" wrapper.
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && existing.changes && typeof existing.changes === 'object') {
      try {
        const migrated = { ...existing, ...existing.changes };
        delete migrated.changes;
        existing = migrated;
        console.log(`Migrated embedded 'changes' object for ${absoluteFilePath}`);
      } catch (e) {
        console.warn(`Failed to migrate embedded 'changes' for ${absoluteFilePath}:`, e);
      }
    }
    
    // Some clients send { filePath, changes: { ... } } while others send flattened top-level change fields.
    // Support both shapes: prefer req.body.changes when present, otherwise use the flattened rest.
    let incomingChanges = changes;
    if (req.body && req.body.changes && typeof req.body.changes === 'object') {
      incomingChanges = req.body.changes;
    }

    // Remove filePath and other computed properties from incomingChanges to prevent them from being saved
    const { filePath: _, modelUrl: __, ...cleanChanges } = incomingChanges;
    // Sanitize and log the cleaned changes to help debug whether nested thumbnails
    // were included by the client. Avoid printing base64 images directly.
    try {
      const preview = JSON.parse(JSON.stringify(cleanChanges, (k, v) => {
        if (typeof v === 'string' && v.length > 200) return `[long string ${v.length} chars]`;
        if (Array.isArray(v) && v.length > 0 && v.every(it => typeof it === 'string' && it.startsWith('data:'))) return `[${v.length} base64 images]`;
        return v;
      }));
      // console.log('[server] cleanChanges preview:', preview);
    } catch (e) {
      console.warn('[server] Failed to build cleanChanges preview', e);
    }
    
    // Normalize tags if provided: trim and dedupe case-insensitively while preserving
    // the original casing of the first occurrence.
    function normalizeTags(tags) {
      if (!Array.isArray(tags)) return tags;
      const seen = new Set();
      const out = [];
      for (const t of tags) {
        if (typeof t !== 'string') continue;
        const trimmed = t.trim();
        const key = trimmed.toLowerCase();
        if (!seen.has(key) && trimmed !== '') {
          seen.add(key);
          out.push(trimmed);
        }
      }
      return out;
    }

    if (cleanChanges.tags) {
      cleanChanges.tags = normalizeTags(cleanChanges.tags);
    }

    function normalizeRelatedFiles(arr) {
      const cleaned = [];
      const rejected = [];
      if (!Array.isArray(arr)) return { cleaned, rejected };
      const seen = new Set();
      for (let raw of arr) {
        if (typeof raw !== 'string') continue;
        let s = raw.trim();
        if (s === '') {
          rejected.push(raw);
          continue; // drop empty entries
        }

        // Reject path traversal
        if (s.includes('..')) {
          rejected.push(raw);
          continue;
        }

        // Normalize backslashes to forward slashes for consistent URLs
        s = s.replace(/\\/g, '/');

        // Reject UNC paths (starting with //) for security reasons
        if (s.startsWith('//')) {
          rejected.push(raw);
          continue;
        }

        // Reject absolute Windows drive paths (e.g., C:/ or C:\) for security
        if (/^[a-zA-Z]:\//.test(s) || /^[a-zA-Z]:\\/.test(raw)) {
          // treat as rejected
          rejected.push(raw);
          continue;
        } else {
          // Strip a single leading slash if present to make it relative to /models when used
          if (s.startsWith('/')) s = s.substring(1);
          if (s.startsWith('/')) s = s.substring(1); // double-check
        }

        // Deduplicate by normalized form
        const key = s.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(s);
        } else {
          // duplicate silently dropped
        }
      }
      return { cleaned, rejected };
    }

    let rejectedRelatedFiles = [];
    if (cleanChanges.related_files) {
      const nf = normalizeRelatedFiles(cleanChanges.related_files);
      cleanChanges.related_files = nf.cleaned;
      rejectedRelatedFiles = nf.rejected;
    }

    // Normalize incoming userDefined shape (accept array, object-with-'0', or object)
    try {
      if (cleanChanges.userDefined) {
        if (Array.isArray(cleanChanges.userDefined) && cleanChanges.userDefined.length > 0) {
          cleanChanges.userDefined = cleanChanges.userDefined[0];
        } else if (typeof cleanChanges.userDefined === 'object' && Object.prototype.hasOwnProperty.call(cleanChanges.userDefined, '0')) {
          // Merge numeric '0' into top-level and keep other top-level fields
          const zero = cleanChanges.userDefined['0'] && typeof cleanChanges.userDefined['0'] === 'object' ? { ...(cleanChanges.userDefined['0']) } : {};
          const imgs = Array.isArray(cleanChanges.userDefined.images) ? cleanChanges.userDefined.images : undefined;
          const thumb = typeof cleanChanges.userDefined.thumbnail !== 'undefined' ? cleanChanges.userDefined.thumbnail : undefined;
          const order = Array.isArray(cleanChanges.userDefined.imageOrder) ? cleanChanges.userDefined.imageOrder : undefined;
          const normalized = { ...zero };
          if (typeof imgs !== 'undefined') normalized.images = imgs;
          if (typeof thumb !== 'undefined') normalized.thumbnail = thumb;
          if (typeof order !== 'undefined') normalized.imageOrder = order;
          cleanChanges.userDefined = normalized;
        }
      }

    } catch (e) {
      console.warn('Failed to normalize incoming userDefined in save-model:', e);
    }

    // At this point we've computed the cleaned changes. Log a concise message:
    const hasUserImages = cleanChanges.userDefined && (
      (Array.isArray(cleanChanges.userDefined.images) && cleanChanges.userDefined.images.length > 0) ||
      (Array.isArray(cleanChanges.userDefined.imageOrder) && cleanChanges.userDefined.imageOrder.length > 0)
    );

    // Ensure userDefined.thumbnail is set if images are present and thumbnail is missing
    if (hasUserImages && cleanChanges.userDefined && !cleanChanges.userDefined.thumbnail) {
      cleanChanges.userDefined.thumbnail = 'user:0';
    }

    if (!cleanChanges || Object.keys(cleanChanges).length === 0) {
      if (hasUserImages) {
        // safeLog('Save model request: Forcing save for userDefined.images/imageOrder', { filePath });
      } else {
        // safeLog('Save model request: No changes to apply for', { filePath });
        console.log('No changes to apply for', absoluteFilePath);
        return res.json({ success: true, message: 'No changes' });
      }
    } else {
      // Only log the cleaned changes (no computed props) to avoid noisy or nested payloads
      // safeLog('Save model request:', { filePath, changes: sanitizeForLog(cleanChanges) });
    }

    // Merge changes carefully. We specially merge `userDefined` so that
    // we don't blindly overwrite existing user data (which could strip images
    // or imageOrder). The client is expected to write descriptors into
    // `userDefined.imageOrder` (no legacy top-level imageOrder support).
    const updated = { ...existing };
    for (const key of Object.keys(cleanChanges)) {
      if (key === 'userDefined') continue; // handle after loop
      updated[key] = cleanChanges[key];
    }

    // Merge userDefined carefully. Support legacy cases where existing.userDefined
    // might be an array (generation produced [ { ... } ]) and where the client
    // may send either an array or an object. Normalize both sides to a single
    // object by using the first element of any array as the base object.
    if (cleanChanges.userDefined) {
      // Build base from existing data
      let existingUDObj = {};
      try {
        if (Array.isArray(existing.userDefined) && existing.userDefined.length > 0 && typeof existing.userDefined[0] === 'object') {
          existingUDObj = { ...(existing.userDefined[0] || {}) };
        } else if (existing.userDefined && typeof existing.userDefined === 'object') {
          existingUDObj = { ...(existing.userDefined) };
        }
      } catch (e) {
        existingUDObj = {};
      }

      // Build incoming object (accept array or object)
      let incomingUDObj = {};
      try {
        if (Array.isArray(cleanChanges.userDefined) && cleanChanges.userDefined.length > 0 && typeof cleanChanges.userDefined[0] === 'object') {
          incomingUDObj = { ...(cleanChanges.userDefined[0] || {}) };
        } else if (cleanChanges.userDefined && typeof cleanChanges.userDefined === 'object') {
          incomingUDObj = { ...(cleanChanges.userDefined) };
        }
      } catch (e) {
        incomingUDObj = {};
      }

      // Shallow merge: incoming fields override existing ones; arrays like
      // images and imageOrder will be replaced if provided by incomingUDObj.
      const mergedUDObj = { ...existingUDObj, ...incomingUDObj };
      // Special handling: client can request clearing the nested description
      // by sending description: null. If so, delete the property from the
      // merged object so the saved file no longer contains it.
      try {
        if (Object.prototype.hasOwnProperty.call(incomingUDObj, 'description') && incomingUDObj.description === null) {
          if (Object.prototype.hasOwnProperty.call(mergedUDObj, 'description')) delete mergedUDObj.description;
        }
      } catch (e) {
        // ignore
      }
      updated.userDefined = mergedUDObj;
    }

    // Ensure the directory exists
    const dir = path.dirname(absoluteFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // REMOVE LEGACY FIELDS: Remove top-level thumbnail and images from the final saved data
    // These fields are deprecated in favor of parsedImages (for parsed content) 
    // and userDefined.images (for user-added content)
    if (updated.hasOwnProperty('thumbnail')) {
      console.log('Removing deprecated top-level thumbnail field from saved data');
      delete updated.thumbnail;
    }
    if (updated.hasOwnProperty('images')) {
      console.log('Removing deprecated top-level images field from saved data');
      delete updated.images;
    }

    // Set created if missing and update lastModified
    try {
      const now = new Date().toISOString();
      if (!existing || !existing.created) {
        updated.created = now;
      } else if (existing.created) {
        updated.created = existing.created;
      }
      updated.lastModified = now;
    } catch (e) {
      // ignore timestamp errors
    }

    // Write atomically: write to a temp file then rename it into place to avoid
    // readers seeing a truncated/partial file during concurrent writes.
    // Protect against accidental writes to raw model files
    const safeTargetPath = protectModelFileWrite(absoluteFilePath);
    const tmpPath = safeTargetPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), 'utf8');
    fs.renameSync(tmpPath, safeTargetPath);
    console.log('Model updated and saved to:', safeTargetPath);
    // Ensure newly saved munchie is post-processed to have canonical userDefined
    try {
      await postProcessMunchieFile(safeTargetPath);
    } catch (e) {
      console.warn('postProcessMunchieFile failed after save for', safeTargetPath, e);
    }
    // Read back the saved file and return it as the authoritative refreshed model
    let refreshedModel = undefined;
    try {
      const rawAfter = fs.readFileSync(safeTargetPath, 'utf8');
      refreshedModel = rawAfter ? JSON.parse(rawAfter) : undefined;
    } catch (e) {
      console.warn('Failed to read back refreshed model after save:', e);
      refreshedModel = undefined;
    }

    // Return cleaned/rejected related_files and refreshedModel for client feedback
    res.json({ success: true, cleaned_related_files: cleanChanges.related_files || [], rejected_related_files: rejectedRelatedFiles, refreshedModel });
  } catch (err) {
    console.error('Error saving model:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to get all model data
app.get('/api/models', async (req, res) => {
  try {
    const absolutePath = getAbsoluteModelsPath();
    serverDebug(`API /models scanning directory: ${absolutePath}`);
    
    let models = [];
    
    // Function to recursively scan directories
    function scanForModels(directory) {
  serverDebug(`Scanning directory: ${directory}`);
      const entries = fs.readdirSync(directory, { withFileTypes: true });
  serverDebug(`Found ${entries.length} entries in ${directory}`);
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories (debug only)
          serverDebug(`Scanning subdirectory: ${fullPath}`);
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          // Load and parse each munchie file
          // console.log(`Found munchie file: ${fullPath}`);
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            // Add relative path information for proper URL construction
            const relativePath = path.relative(absolutePath, fullPath);
            
            // Handle both 3MF and STL file types
            let modelUrl, filePath;
            if (entry.name.endsWith('-stl-munchie.json')) {
              // STL file - check if corresponding .stl file exists
              // Only process files with proper naming format: [name]-stl-munchie.json
              const fileName = entry.name;
              
              // Skip files with malformed names (e.g., containing duplicate suffixes)
              if (fileName.includes('-stl-munchie.json_')) {
                serverDebug(`Skipping malformed STL JSON file: ${fullPath}`);
              } else {
                const baseFilePath = relativePath.replace('-stl-munchie.json', '');
                // Try both .stl and .STL extensions
                let stlFilePath = baseFilePath + '.stl';
                let absoluteStlPath = path.join(absolutePath, stlFilePath);
                
                if (!fs.existsSync(absoluteStlPath)) {
                  // Try uppercase extension
                  stlFilePath = baseFilePath + '.STL';
                  absoluteStlPath = path.join(absolutePath, stlFilePath);
                }
                
                if (fs.existsSync(absoluteStlPath)) {
                  modelUrl = '/models/' + stlFilePath.replace(/\\/g, '/');
                  filePath = stlFilePath;
                  
                  model.modelUrl = modelUrl;
                  model.filePath = filePath;
                  
                  // console.log(`Added STL model: ${model.name} with URL: ${model.modelUrl} and filePath: ${model.filePath}`);
                  models.push(model);
                } else {
                  serverDebug(`Skipping ${fullPath} - corresponding .stl/.STL file not found`);
                }
              }
            } else {
              // 3MF file - check if corresponding .3mf file exists
              // Only process files with proper naming format: [name]-munchie.json
              const fileName = entry.name;
              
              // Skip files with malformed names
              if (fileName.includes('-munchie.json_')) {
                serverDebug(`Skipping malformed 3MF JSON file: ${fullPath}`);
              } else {
                const threeMfFilePath = relativePath.replace('-munchie.json', '.3mf');
                const absoluteThreeMfPath = path.join(absolutePath, threeMfFilePath);
                
                if (fs.existsSync(absoluteThreeMfPath)) {
                  modelUrl = '/models/' + threeMfFilePath.replace(/\\/g, '/');
                  filePath = threeMfFilePath;
                  
                  model.modelUrl = modelUrl;
                  model.filePath = filePath;
                  
                  // console.log(`Added 3MF model: ${model.name} with URL: ${model.modelUrl} and filePath: ${model.filePath}`);
                  models.push(model);
                } else {
                  serverDebug(`Skipping ${fullPath} - corresponding .3mf file not found at ${absoluteThreeMfPath}`);
                }
              }
            }
          } catch (error) {
                console.error(`Error reading model file ${fullPath}:`, error);
          }
        }
      }
    }
    
  // Start the recursive scan
  scanForModels(absolutePath);

  // Summary: concise result for normal logs (debug contains per-directory details)
  console.log(`API /models scan complete: found ${models.length} model(s)`);

  res.json(models);
  } catch (error) {
    console.error('Error loading models:', error);
    res.status(500).json({ success: false, message: 'Failed to load models', error: error.message });
  }
});

// API endpoint to trigger model directory scan and JSON generation
app.post('/api/scan-models', async (req, res) => {
  try {
    const { fileType = "3mf", stream = false } = req.body; // "3mf" or "stl" only
    const dir = getModelsDirectory();
    const result = await scanDirectory(dir, fileType);

    // After scanning, also run legacy image migration on munchie files so that
    // generated files do not contain top-level `thumbnail` or `images` fields.
    const modelsDir = getAbsoluteModelsPath();
  const migrated = [];
    const skipped = [];
    const errors = [];

    // Helper to perform migration for a single file (returns true if changed)
    function migrateFile(full) {
      try {
        const raw = fs.readFileSync(full, 'utf8');
        if (!raw || raw.trim().length === 0) { skipped.push({ file: full, reason: 'empty' }); return false; }
        let data = JSON.parse(raw);
        let changed = false;

        // Legacy top-level images -> parsedImages
        if (Array.isArray(data.images) && (!Array.isArray(data.parsedImages) || data.parsedImages.length === 0)) {
          data.parsedImages = data.images.slice();
          try { delete data.images; } catch (e) { }
          changed = true;
        }

        // Legacy top-level thumbnail handling
        if (data.thumbnail && typeof data.thumbnail === 'string') {
          if (data.thumbnail.startsWith('data:')) {
            if (!Array.isArray(data.parsedImages)) data.parsedImages = [];
            const existingIdx = data.parsedImages.findIndex(p => p === data.thumbnail || (p && p.data === data.thumbnail));
            if (existingIdx !== -1) data.parsedImages.splice(existingIdx, 1);
            data.parsedImages.unshift(data.thumbnail);
            try { delete data.thumbnail; } catch (e) { }
            changed = true;
          } else if (!data.userDefined) {
            if (/^parsed:\d+|^user:\d+/.test(data.thumbnail)) {
              data.userDefined = { thumbnail: data.thumbnail };
            } else if (Array.isArray(data.parsedImages) && data.parsedImages.indexOf(data.thumbnail) !== -1) {
              const idx = data.parsedImages.indexOf(data.thumbnail);
              data.userDefined = { thumbnail: `parsed:${idx}` };
            } else {
              data.userDefined = { thumbnail: data.thumbnail };
            }
            try { delete data.thumbnail; } catch (e) { }
            changed = true;
          } else {
            try { delete data.thumbnail; } catch (e) { }
            changed = true;
          }
        }

        // Ensure userDefined.images exists
        if (data.userDefined && typeof data.userDefined === 'object') {
          if (!Array.isArray(data.userDefined.images)) data.userDefined.images = [];
        }

        // Reuse existing postProcess logic to ensure userDefined.thumbnail and imageOrder
        const parsedImages = Array.isArray(data.parsedImages) ? data.parsedImages : (Array.isArray(data.images) ? data.images : []);
        let udExists = data.userDefined && typeof data.userDefined === 'object';
        // Normalize legacy userDefined shapes
        if (Array.isArray(data.userDefined)) {
          data.userDefined = data.userDefined.length > 0 && typeof data.userDefined[0] === 'object' ? { ...(data.userDefined[0]) } : {};
          udExists = true;
          changed = true;
        } else if (udExists && Object.prototype.hasOwnProperty.call(data.userDefined, '0')) {
          const zero = data.userDefined['0'] && typeof data.userDefined['0'] === 'object' ? { ...(data.userDefined['0']) } : {};
          const imgs = Array.isArray(data.userDefined.images) ? data.userDefined.images : undefined;
          const thumb = typeof data.userDefined.thumbnail !== 'undefined' ? data.userDefined.thumbnail : undefined;
          const order = Array.isArray(data.userDefined.imageOrder) ? data.userDefined.imageOrder : undefined;
          const normalized = { ...zero };
          if (typeof imgs !== 'undefined') normalized.images = imgs;
          if (typeof thumb !== 'undefined') normalized.thumbnail = thumb;
          if (typeof order !== 'undefined') normalized.imageOrder = order;
          data.userDefined = normalized;
          udExists = true;
          changed = true;
        }

        if (parsedImages && parsedImages.length > 0) {
          if (!udExists) {
            data.userDefined = {};
            udExists = true;
            changed = true;
          }
          if (!data.userDefined.thumbnail) {
            data.userDefined.thumbnail = 'parsed:0';
            changed = true;
          }
          if (!Array.isArray(data.userDefined.imageOrder) || data.userDefined.imageOrder.length === 0) {
            const order = [];
            for (let i = 0; i < parsedImages.length; i++) order.push(`parsed:${i}`);
            const userImgs = Array.isArray(data.userDefined.images) ? data.userDefined.images : [];
            for (let i = 0; i < userImgs.length; i++) order.push(`user:${i}`);
            data.userDefined.imageOrder = order;
            changed = true;
          }
        }

        // Remove any lingering legacy top-level fields
        if (Object.prototype.hasOwnProperty.call(data, 'images')) {
          try { delete data.images; changed = true; } catch (e) { }
        }
        if (Object.prototype.hasOwnProperty.call(data, 'thumbnail')) {
          try { delete data.thumbnail; changed = true; } catch (e) { }
        }

        if (changed) {
          const tmp = full + '.tmp';
          fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
          fs.renameSync(tmp, full);
          migrated.push(full);
          return true;
        } else {
          skipped.push(full);
          return false;
        }
      } catch (e) {
        errors.push({ file: full, error: e.message || String(e) });
        return false;
      }
    }

    // Walk the models directory and migrate munchie files
    function scanAndMigrate(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanAndMigrate(full);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          const changed = migrateFile(full);
          // If client requested streaming, send a progress line
          if (stream) {
            try {
              res.write(JSON.stringify({ type: 'migrate-file', file: path.relative(modelsDir, full).replace(/\\/g, '/'), changed: !!changed }) + '\n');
            } catch (e) { /* ignore write errors */ }
          }
        }
      }
    }

    if (stream) {
      // Stream NDJSON progress lines to the client
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      // Start with an initial line containing scan result
      res.write(JSON.stringify({ type: 'scan-complete', processed: result.processed, skipped: result.skipped }) + '\n');
      try {
        scanAndMigrate(modelsDir);
      } catch (e) {
        console.warn('Migration during scan failed:', e);
        res.write(JSON.stringify({ type: 'error', error: String(e) }) + '\n');
      }
      // Final summary
  res.write(JSON.stringify({ type: 'done', success: true, processed: result.processed, skipped: result.skipped, skippedFiles: skipped.length, errors }) + '\n');
      return res.end();
    } else {
      // Non-streaming: run migration and respond with final JSON
      try {
        scanAndMigrate(modelsDir);
      } catch (e) {
        console.warn('Migration during scan failed:', e);
      }
      // Post-process any remaining munchie files (defensive)
      try {
        function findAndPostProcess(directory) {
          const entries = fs.readdirSync(directory, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(directory, entry.name);
            if (entry.isDirectory()) {
              findAndPostProcess(full);
            } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
              try { postProcessMunchieFile(full); } catch (e) { /* ignore */ }
            }
          }
        }
        findAndPostProcess(modelsDir);
      } catch (e) {
        console.warn('Post-processing after migration failed:', e);
      }

      // Detect orphan munchie.json files (munchie exists but corresponding .3mf/.stl missing)
      const orphanMunchies = [];
      try {
        function findOrphans(directory) {
          const entries = fs.readdirSync(directory, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(directory, entry.name);
            if (entry.isDirectory()) {
              findOrphans(full);
            } else if (entry.isFile() && (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json'))) {
              // compute expected model filename
              const base = entry.name.replace(/-munchie\.json$/i, '').replace(/-stl-munchie\.json$/i, '');
              const threeMfCandidate = path.join(path.dirname(full), base + '.3mf');
              const stlCandidate = path.join(path.dirname(full), base + '.stl');
              if (!fs.existsSync(threeMfCandidate) && !fs.existsSync(stlCandidate)) {
                orphanMunchies.push(path.relative(modelsDir, full).replace(/\\/g, '/'));
              }
            }
          }
        }
        findOrphans(modelsDir);
      } catch (e) {
        console.warn('Orphan munchie detection failed:', e);
      }

      res.json({ success: true, message: 'Model JSON files generated and updated successfully.', processed: result.processed, skipped: result.skipped, skippedFiles: skipped.length, errors, orphanMunchies });
    }
  } catch (error) {
    console.error('Model JSON generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate model JSON files.', error: error.message });
  }
});

// NOTE: Migration of legacy images is now performed as part of /api/scan-models
// The old /api/migrate-legacy-images endpoint has been removed.

// API endpoint to save app configuration to data/config.json
app.post('/api/save-config', (req, res) => {
  try {
    const config = req.body;
    console.log('[server] POST /api/save-config called, incoming lastModified=', config && config.lastModified);
    if (!config) {
      return res.status(400).json({ success: false, error: 'No configuration provided' });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const configPath = path.join(dataDir, 'config.json');
    // Ensure lastModified is updated on server-side save
    const finalConfig = { ...config, lastModified: new Date().toISOString() };
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), 'utf8');
    console.log('[server] Saved configuration to', configPath, 'server lastModified=', finalConfig.lastModified);
    res.json({ success: true, path: configPath, config: finalConfig });
  } catch (err) {
    console.error('Failed to save config to data/config.json:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to load config.json from the data directory
app.get('/api/load-config', (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ success: false, error: 'No server-side config found' });
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    console.log('[server] GET /api/load-config served, server lastModified=', parsed.lastModified);
    res.json({ success: true, config: parsed });
  } catch (err) {
    console.error('Failed to load config from data/config.json:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to regenerate munchie files for specific models
app.post('/api/regenerate-munchie-files', async (req, res) => {
  try {
    const { modelIds, filePaths } = req.body || {};
    if ((!Array.isArray(modelIds) || modelIds.length === 0) && (!Array.isArray(filePaths) || filePaths.length === 0)) {
      return res.status(400).json({ success: false, error: 'No model IDs or file paths provided' });
    }

    const modelsDir = getAbsoluteModelsPath();
    const { parse3MF, parseSTL, computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    let processed = 0;
    let errors = [];

    // Build a list of existing munchie files (with filePath and jsonPath)
    let allModels = [];
    function scanForModels(directory) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            const relativePath = path.relative(modelsDir, fullPath);
            if (entry.name.endsWith('-stl-munchie.json')) {
              model.filePath = relativePath.replace('-stl-munchie.json', '.stl');
            } else {
              model.filePath = relativePath.replace('-munchie.json', '.3mf');
            }
            model.jsonPath = fullPath;
            allModels.push(model);
          } catch (e) {
            console.warn('Skipping invalid munchie file during regenerate scan:', fullPath, e);
          }
        }
      }
    }

    scanForModels(modelsDir);

    // Helper to regenerate from an absolute model file path and target jsonPath
    async function regenerateFromPaths(modelFilePath, jsonPath, idForModel) {
      try {
        if (!fs.existsSync(modelFilePath)) {
          return { error: 'Model file not found' };
        }

        // Backup user-managed fields from existing JSON if present
        let currentData = {};
        if (jsonPath && fs.existsSync(jsonPath)) {
          try { currentData = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) { /* ignore */ }
        }
        const userDataBackup = {
          tags: currentData.tags || [],
          isPrinted: currentData.isPrinted || false,
          printTime: currentData.printTime || "",
          filamentUsed: currentData.filamentUsed || "",
          category: currentData.category || "",
          notes: currentData.notes || "",
          license: currentData.license || "",
          hidden: currentData.hidden || false,
          source: currentData.source || "",
          price: currentData.price || 0,
          related_files: Array.isArray(currentData.related_files) ? currentData.related_files : [],
          userDefined: currentData.userDefined && typeof currentData.userDefined === 'object' ? currentData.userDefined : {}
        };

        const buffer = fs.readFileSync(modelFilePath);
        const hash = computeMD5(buffer);
        let newMetadata;
        if (modelFilePath.toLowerCase().endsWith('.3mf')) {
          newMetadata = await parse3MF(modelFilePath, idForModel, hash);
        } else if (modelFilePath.toLowerCase().endsWith('.stl')) {
          newMetadata = await parseSTL(modelFilePath, idForModel, hash);
        } else {
          return { error: 'Unsupported file type' };
        }

        const mergedMetadata = { ...newMetadata, ...userDataBackup, id: idForModel, hash };
        // Ensure created/lastModified timestamps for regenerated file
        try {
          const now = new Date().toISOString();
          if (!mergedMetadata.created) mergedMetadata.created = now;
          mergedMetadata.lastModified = now;
        } catch (e) {
          // ignore
        }

        // Rebuild imageOrder so descriptors point to correct indexes
        try {
          const parsed = Array.isArray(mergedMetadata.parsedImages) ? mergedMetadata.parsedImages : (Array.isArray(mergedMetadata.images) ? mergedMetadata.images : []);
          const userArr = Array.isArray(mergedMetadata.userDefined?.images) ? mergedMetadata.userDefined.images : [];
          const getUserImageData = (entry) => {
            if (!entry) return '';
            if (typeof entry === 'string') return entry;
            if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
            return '';
          };

          const rebuiltOrder = [];
          for (let i = 0; i < parsed.length; i++) rebuiltOrder.push(`parsed:${i}`);
          for (let i = 0; i < userArr.length; i++) rebuiltOrder.push(`user:${i}`);

          if (!mergedMetadata.userDefined || typeof mergedMetadata.userDefined !== 'object') mergedMetadata.userDefined = {};
          mergedMetadata.userDefined = { ...(mergedMetadata.userDefined || {}), imageOrder: rebuiltOrder };
        } catch (e) {
          console.warn('Failed to rebuild userDefined.imageOrder during regeneration:', e);
        }

        // Ensure target jsonPath is defined
        if (!jsonPath) {
          return { error: 'No target JSON path provided' };
        }

        // Ensure directory exists for jsonPath
        const dir = path.dirname(jsonPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Write the regenerated file and post-process
        fs.writeFileSync(jsonPath, JSON.stringify(mergedMetadata, null, 2), 'utf8');
        await postProcessMunchieFile(jsonPath);
        return { success: true };
      } catch (error) {
        return { error: error && error.message ? error.message : String(error) };
      }
    }

    // First, handle any requested modelIds (existing munchie-based regeneration)
    if (Array.isArray(modelIds) && modelIds.length > 0) {
      for (const modelId of modelIds) {
        const model = allModels.find(m => m.id === modelId);
        if (!model) {
          errors.push({ modelId, error: 'Model not found' });
          continue;
        }

        try {
          const modelFilePath = path.join(modelsDir, model.filePath);
          if (!fs.existsSync(modelFilePath)) {
            errors.push({ modelId, error: 'Model file not found' });
            continue;
          }

          const resObj = await regenerateFromPaths(modelFilePath, model.jsonPath, model.id);
          if (resObj && resObj.error) errors.push({ modelId, error: resObj.error }); else processed++;
        } catch (error) {
          console.error(`Error regenerating munchie file for model ${modelId}:`, error);
          errors.push({ modelId, error: error.message });
        }
      }
    }

    // Next, handle any provided filePaths (relative to models dir)
    if (Array.isArray(filePaths) && filePaths.length > 0) {
      for (const rawPath of filePaths) {
        try {
          if (!rawPath || typeof rawPath !== 'string') { errors.push({ filePath: rawPath, error: 'Invalid path' }); continue; }
          let rel = rawPath.replace(/\\/g, '/').replace(/^\//, '');
          if (rel.includes('..')) { errors.push({ filePath: rawPath, error: 'Path traversal not allowed' }); continue; }

          const modelFilePath = path.join(modelsDir, rel);

          if (!fs.existsSync(modelFilePath)) { errors.push({ filePath: rawPath, error: 'Model file not found' }); continue; }

          // Compute expected JSON path
          let jsonRel;
          if (rel.toLowerCase().endsWith('.3mf')) jsonRel = rel.replace(/\.3mf$/i, '-munchie.json');
          else if (rel.toLowerCase().endsWith('.stl')) jsonRel = rel.replace(/\.stl$/i, '-stl-munchie.json');
          else { errors.push({ filePath: rawPath, error: 'Unsupported file type' }); continue; }

          const jsonPath = path.join(modelsDir, jsonRel);
          // Derive a sensible id from filename if none exists
          const derivedId = path.basename(rel).replace(/\.3mf$/i, '').replace(/\.stl$/i, '');

          const resObj = await regenerateFromPaths(modelFilePath, jsonPath, derivedId);
          if (resObj && resObj.error) errors.push({ filePath: rawPath, error: resObj.error }); else processed++;
        } catch (error) {
          errors.push({ filePath: rawPath, error: error && error.message ? error.message : String(error) });
        }
      }
    }

    res.json({ success: errors.length === 0, processed, errors, message: `Regenerated ${processed} munchie files${errors.length > 0 ? ` with ${errors.length} errors` : ''}` });
  } catch (error) {
    console.error('Munchie file regeneration error:', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate munchie files.', error: error.message });
  }
});

// API endpoint to upload .3mf / .stl files and generate their munchie.json files
app.post('/api/upload-models', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ success: false, error: 'No files uploaded' });

    const modelsDir = getAbsoluteModelsPath();
    const uploadsDir = path.join(modelsDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const { parse3MF, parseSTL, computeMD5 } = require('./dist-backend/utils/threeMFToJson');

  const saved = [];
  const processed = [];
  const errors = [];

    // Parse optional destinations JSON (array aligned with files order)
    let destinations = null;
    try {
      if (req.body && req.body.destinations) {
        destinations = JSON.parse(req.body.destinations);
        if (!Array.isArray(destinations)) destinations = null;
      }
    } catch (e) {
      destinations = null;
    }

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const f = files[fileIndex];
      try {
        // multer memoryStorage provides buffer
        const buffer = f.buffer;
        const original = (f.originalname || 'upload').replace(/\\/g, '/');
        // sanitize filename
        let base = path.basename(original).replace(/[^a-zA-Z0-9_.\- ]/g, '_');
        if (!/\.3mf$/i.test(base) && !/\.stl$/i.test(base)) {
          errors.push({ file: original, error: 'Unsupported file extension' });
          continue;
        }
        // Determine destination folder (if provided) relative to models dir
        let destFolder = 'uploads';
        if (destinations && Array.isArray(destinations) && typeof destinations[fileIndex] === 'string' && destinations[fileIndex].trim() !== '') {
          // normalize and prevent traversal
          let candidate = destinations[fileIndex].replace(/\\/g, '/').replace(/^\/*/, '');
          if (candidate.includes('..')) candidate = 'uploads';
          destFolder = candidate || 'uploads';
        }

        const destDir = path.join(modelsDir, destFolder);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        let targetPath = path.join(destDir, base);
        // avoid collisions by appending timestamp when necessary
        if (fs.existsSync(targetPath)) {
          const name = base.replace(/(\.[^.]+)$/, '');
          const ext = path.extname(base);
          const ts = Date.now();
          base = `${name}-${ts}${ext}`;
          targetPath = path.join(destDir, base);
        }

        // Write uploaded file atomically: write to tmp then rename. Protect
        // against a race where another process creates the same filename
        // between our exists-check and the rename. If the target exists at
        // rename-time, pick a new unique name and rename there instead.
        const tmpUploadPath = targetPath + '.tmp';
        fs.writeFileSync(tmpUploadPath, buffer);

        // If targetPath was created between our earlier exists check and now,
        // avoid overwriting: choose a new name with a timestamp/random suffix.
        if (fs.existsSync(targetPath)) {
          const name = base.replace(/(\.[^.]+)$/, '');
          const ext = path.extname(base);
          const ts = Date.now();
          const rnd = Math.floor(Math.random() * 10000);
          base = `${name}-${ts}-${rnd}${ext}`;
          targetPath = path.join(destDir, base);
        }
        fs.renameSync(tmpUploadPath, targetPath);
        saved.push(path.relative(modelsDir, targetPath).replace(/\\/g, '/'));

        // Now generate munchie.json for the saved file (reuse regeneration logic)
        try {
          const modelFilePath = targetPath;
          const rel = path.relative(modelsDir, modelFilePath).replace(/\\/g, '/');
          let jsonRel;
          if (rel.toLowerCase().endsWith('.3mf')) jsonRel = rel.replace(/\.3mf$/i, '-munchie.json');
          else if (rel.toLowerCase().endsWith('.stl')) jsonRel = rel.replace(/\.stl$/i, '-stl-munchie.json');
          else {
            errors.push({ file: rel, error: 'Unsupported file type for processing' });
            continue;
          }

          const jsonPath = path.join(modelsDir, jsonRel);
          const derivedId = path.basename(rel).replace(/\.3mf$/i, '').replace(/\.stl$/i, '');

          const fileBuf = fs.readFileSync(modelFilePath);
          const hash = computeMD5(fileBuf);
          let newMetadata;
          if (modelFilePath.toLowerCase().endsWith('.3mf')) {
            newMetadata = await parse3MF(modelFilePath, derivedId, hash);
          } else {
            newMetadata = await parseSTL(modelFilePath, derivedId, hash);
          }

          const mergedMetadata = { ...newMetadata, id: derivedId, hash };
          // Ensure created/lastModified timestamps for newly uploaded file
          try {
            const now = new Date().toISOString();
            if (!mergedMetadata.created) mergedMetadata.created = now;
            mergedMetadata.lastModified = now;
          } catch (e) { /* ignore */ }

          // Rebuild imageOrder similar to regeneration logic
          try {
            const parsed = Array.isArray(mergedMetadata.parsedImages) ? mergedMetadata.parsedImages : (Array.isArray(mergedMetadata.images) ? mergedMetadata.images : []);
            const userArr = Array.isArray(mergedMetadata.userDefined?.images) ? mergedMetadata.userDefined.images : [];
            const rebuiltOrder = [];
            for (let i = 0; i < parsed.length; i++) rebuiltOrder.push(`parsed:${i}`);
            for (let i = 0; i < userArr.length; i++) rebuiltOrder.push(`user:${i}`);
            if (!mergedMetadata.userDefined || typeof mergedMetadata.userDefined !== 'object') mergedMetadata.userDefined = {};
            mergedMetadata.userDefined = { ...(mergedMetadata.userDefined || {}), imageOrder: rebuiltOrder };
          } catch (e) {
            console.warn('Failed to rebuild userDefined.imageOrder during upload processing:', e);
          }

          // Ensure directory exists for jsonPath
          const jdir = path.dirname(jsonPath);
          if (!fs.existsSync(jdir)) fs.mkdirSync(jdir, { recursive: true });
          fs.writeFileSync(jsonPath, JSON.stringify(mergedMetadata, null, 2), 'utf8');
          await postProcessMunchieFile(jsonPath);
          processed.push(jsonRel);
        } catch (e) {
          errors.push({ file: base, error: e && e.message ? e.message : String(e) });
        }
      } catch (e) {
        errors.push({ file: f.originalname || 'unknown', error: e && e.message ? e.message : String(e) });
      }
    }

    res.json({ success: errors.length === 0, saved, processed, errors });
  } catch (e) {
    console.error('Upload processing error:', e);
    res.status(500).json({ success: false, error: e && e.message ? e.message : String(e) });
  }
});

// API endpoint to list model folders (for upload destination selection)
app.get('/api/model-folders', (req, res) => {
  try {
    const modelsDir = getAbsoluteModelsPath();
    const folders = [];

    function walk(dir, rel = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subRel = rel ? (rel + '/' + entry.name) : entry.name;
          folders.push(subRel);
          try { walk(path.join(dir, entry.name), subRel); } catch (e) { /* ignore */ }
        }
      }
    }

    // include root 'uploads' by default
    folders.push('uploads');
    if (fs.existsSync(modelsDir)) {
      walk(modelsDir);
    }
    // Deduplicate and sort
    const uniq = Array.from(new Set(folders)).sort();
    res.json({ success: true, folders: uniq });
  } catch (e) {
    console.error('Failed to list model folders:', e);
    res.status(500).json({ success: false, error: e && e.message ? e.message : String(e) });
  }
});

// API endpoint to create a new folder under the models directory
app.post('/api/create-model-folder', express.json(), (req, res) => {
  try {
    const { folder } = req.body || {};
    if (!folder || typeof folder !== 'string' || folder.trim() === '') return res.status(400).json({ success: false, error: 'No folder provided' });
    // sanitize and validate: ensure folder is within modelsDir
    const modelsDir = getAbsoluteModelsPath();
    // Remove leading/trailing whitespace and slashes
    let candidate = folder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    // Resolve the absolute path of the target folder
    const target = path.resolve(modelsDir, candidate);
    // Ensure the target is within modelsDir
    if (!target.startsWith(modelsDir)) {
      return res.status(400).json({ success: false, error: 'Invalid folder path' });
    }
    if (fs.existsSync(target)) return res.json({ success: true, created: false, path: path.relative(modelsDir, target).replace(/\\/g, '/') });
    fs.mkdirSync(target, { recursive: true });
    res.json({ success: true, created: true, path: path.relative(modelsDir, target).replace(/\\/g, '/') });
  } catch (e) {
    console.error('Failed to create model folder:', e);
    res.status(500).json({ success: false, error: e && e.message ? e.message : String(e) });
  }
});

// --- API: Get all -munchie.json files and their hashes ---
app.get('/api/munchie-files', (req, res) => {
  const modelsDir = getAbsoluteModelsPath();
  let result = [];
  
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.name.toLowerCase().endsWith('-munchie.json')) {
          try {
            const data = fs.readFileSync(fullPath, 'utf8');
            const json = JSON.parse(data);
            // Get path relative to models directory for the URL
            const relativePath = path.relative(modelsDir, fullPath);
            result.push({
              fileName: entry.name,
              hash: json.hash,
              modelUrl: '/models/' + relativePath.replace(/\\/g, '/')
            });
          } catch (e) {
            // skip unreadable or invalid files
            console.error(`Error reading file ${fullPath}:`, e);
          }
        }
      }
    } catch (e) {
      console.error(`Error scanning directory ${dir}:`, e);
    }
  }

  try {
    scanDirectory(modelsDir);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read models directory' });
  }
});

// --- API: Hash check for all .3mf files and their -munchie.json ---
app.post('/api/hash-check', async (req, res) => {
  try {
    const { fileType = "3mf" } = req.body; // "3mf" or "stl" only
    const modelsDir = getAbsoluteModelsPath();
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    let result = [];
    let seenHashes = new Set();
    let hashToFiles = {};
    let errors = [];
    let modelMap = {};

    // Recursively scan directories
    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const relativePath = path.relative(modelsDir, fullPath);
          
          if (fileType === "3mf") {
            // Only process 3MF files and their JSON companions
            if (relativePath.toLowerCase().endsWith('.3mf')) {
              const base = relativePath.replace(/\.3mf$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].threeMF = relativePath;
            } else if (relativePath.toLowerCase().endsWith('-munchie.json')) {
              const base = relativePath.replace(/-munchie\.json$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].json = relativePath;
            }
          } else if (fileType === "stl") {
            // Only process STL files and their JSON companions
            if (relativePath.toLowerCase().endsWith('.stl')) {
              const base = relativePath.replace(/\.stl$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].stl = relativePath;
            } else if (relativePath.toLowerCase().endsWith('-stl-munchie.json')) {
              const base = relativePath.replace(/-stl-munchie\.json$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].json = relativePath;
            }
          }
        }
      }
    }

    // Start recursive scan
    scanDirectory(modelsDir);

    // Clean up the modelMap to only include entries that have the expected file type
    const cleanedModelMap = {};
    for (const base in modelMap) {
      const entry = modelMap[base];
      if (fileType === "3mf" && entry.threeMF) {
        // Only include 3MF entries when in 3MF mode
        cleanedModelMap[base] = entry;
      } else if (fileType === "stl" && entry.stl) {
        // Only include STL entries when in STL mode
        cleanedModelMap[base] = entry;
      }
    }

    // Process all found models
    for (const base in cleanedModelMap) {
      const entry = cleanedModelMap[base];
      const threeMFPath = entry.threeMF ? path.join(modelsDir, entry.threeMF) : null;
      const stlPath = entry.stl ? path.join(modelsDir, entry.stl) : null;
      const jsonPath = entry.json ? path.join(modelsDir, entry.json) : null;
      const modelPath = threeMFPath || stlPath; // Prefer 3MF, but use STL if no 3MF
      let status = 'ok';
      let details = '';
      let hash = null;
      let storedHash = null;

      try {
        if (!modelPath || !fs.existsSync(modelPath)) {
          status = 'missing';
          details = 'Model file not found';
        } else {
          const buffer = fs.readFileSync(modelPath);
          try {
            hash = computeMD5(buffer);
          } catch (e) {
            hash = null;
            status = 'error';
            details = 'Failed to compute hash: ' + (e && e.message ? e.message : String(e));
          }

          // Try reading stored hash from munchie JSON if present
          if (jsonPath && fs.existsSync(jsonPath)) {
            try {
              const raw = fs.readFileSync(jsonPath, 'utf8');
              if (raw && raw.trim().length > 0) {
                const parsed = JSON.parse(raw);
                // Common stored hash field names: hash, md5, fileHash
                storedHash = parsed && (parsed.hash || parsed.md5 || parsed.fileHash || null);
              }
            } catch (e) {
              // ignore parse errors, but record details
              if (!details) details = 'Failed to read munchie JSON: ' + (e && e.message ? e.message : String(e));
            }
          } else {
            // munchie JSON is missing for this model
            if (!details) {
              details = 'Munchie JSON file missing';
            }
            if (status === 'ok') {
              status = 'missing_munchie';
            }
          }

          // Compare hashes if both present
          if (hash && storedHash && hash !== storedHash) {
            status = 'changed';
            details = details ? details + '; hash mismatch' : 'Hash mismatch: file changed since last recorded';
          }
        }
      } catch (e) {
        status = 'error';
        details = e && e.message ? e.message : String(e);
      }

      // Store hash for duplicate checking (but don't change status for duplicates)
      if (hash) {
        if (hashToFiles[hash]) {
          hashToFiles[hash].push(base);
        } else {
          hashToFiles[hash] = [base];
        }
      }

      result.push({
        baseName: base,
        threeMF: entry.threeMF || null,
        stl: entry.stl || null,
        json: entry.json || null,
        hash,
        storedHash,
        status,
        details
      });
    }

    // Add info about which files share duplicate hashes
    result.forEach(r => {
      if (r.hash && hashToFiles[r.hash] && hashToFiles[r.hash].length > 1) {
        r.duplicates = hashToFiles[r.hash].filter(b => b !== r.baseName);
      }
    });

    res.json({ success: true, results: result });
  } catch (e) {
    console.error('Hash check error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// API endpoint to load a model from a munchie.json file
app.get('/api/load-model', async (req, res) => {
  try {
    const { filePath, id } = req.query;
    // Prefer id-based lookup when provided (more robust)
    const modelsDir = path.resolve(getModelsDirectory());

    // If `id` provided, try scanning for a munchie.json with matching id
    if (id && typeof id === 'string' && id.trim().length > 0) {
      safeLog('Load model by id requested', { id });
      // Recursively search munchie files for matching id
      function findById(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const r = findById(full);
            if (r) return r;
          } else if (entry.name.toLowerCase().endsWith('-munchie.json') || entry.name.toLowerCase().endsWith('-stl-munchie.json')) {
            try {
              const raw = fs.readFileSync(full, 'utf8');
              if (!raw || raw.trim().length === 0) continue;
              const parsed = JSON.parse(raw);
              if (parsed && (parsed.id === id || parsed.name === id)) {
                return full;
              }
            } catch (e) {
              // ignore parse/read errors
            }
          }
        }
        return null;
      }

      try {
        const found = findById(modelsDir);
        if (found) {
          const content = fs.readFileSync(found, 'utf8');
          const parsed = JSON.parse(content);
          return res.json(parsed);
        }
        // If search completed without finding a match, return 404 to indicate not found
        return res.status(404).json({ success: false, error: 'Model not found for id' });
      } catch (e) {
        console.error('Error during id lookup for /api/load-model (falling back to filePath):', e);
        // On unexpected errors, fall through to filePath handling below
      }
    }

    console.log('Load model request for filePath:', filePath, 'id:', id);

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file path' });
    }

    // If filePath is absolute, resolve it directly. If relative, treat it as relative to the models directory
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = path.resolve(filePath);
    } else {
      // Normalize incoming slashes and strip leading slash if present
      let rel = filePath.replace(/\\/g, '/').replace(/^\//, '');
      // Prevent traversal attempts
      if (rel.includes('..')) return res.status(400).json({ success: false, error: 'Invalid relative path' });
      fullPath = path.join(modelsDir, rel);
    }
    safeLog('Resolved path for /api/load-model', { resolved: fullPath });

    // Ensure the path is within the models directory for security
    const resolvedModelsDir = modelsDir.endsWith(path.sep) ? modelsDir : modelsDir + path.sep;
    const resolvedFull = fullPath;
    if (!resolvedFull.startsWith(modelsDir) && !resolvedFull.startsWith(resolvedModelsDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Validate that we're only loading JSON files
    if (!fullPath.toLowerCase().endsWith('.json')) {
      console.log('Attempt to load non-JSON file as model data:', fullPath);
      return res.status(400).json({ success: false, error: 'Only JSON files can be loaded as model data' });
    }

    // Read the file content first to check if it's valid
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    if (fileContent.trim().length === 0) {
      console.log('Empty file detected:', fullPath);
      return res.status(400).json({ success: false, error: 'Empty file' });
    }

    // Read and parse the JSON file
    const modelData = JSON.parse(fileContent);
    res.json(modelData);
  } catch (error) {
    console.error('Error loading model:', error);
    res.status(500).json({ success: false, error: 'Failed to load model data' });
  }
});

app.post('/api/delete-models', (req, res) => {
  const { files } = req.body; // array of file paths relative to models dir
  if (!Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'No files provided' });
  }
  const modelsDir = getAbsoluteModelsPath();
  let deleted = [];
  let errors = [];
  files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted.push(file);
      }
    } catch (err) {
      errors.push({ file, error: err.message });
    }
  });
  res.json({ success: errors.length === 0, deleted, errors });
});

// API endpoint to verify a related file path (used by frontend Verify button)
app.post('/api/verify-file', (req, res) => {
  try {
    const { path: incomingPath } = req.body || {};
    if (!incomingPath || typeof incomingPath !== 'string') {
      return res.status(400).json({ success: false, error: 'Path required' });
    }

    // Basic normalization similar to other server helpers
    let s = incomingPath.trim();
    if (s === '') return res.status(400).json({ success: false, error: 'Empty path' });
    // Strip quotes
    if (/^['"].*['"]$/.test(s)) s = s.replace(/^['"]|['"]$/g, '').trim();
    // Reject traversal
    if (s.includes('..')) return res.status(400).json({ success: false, error: 'Path traversal not allowed' });
    // Normalize slashes
    s = s.replace(/\\/g, '/');
    // Reject UNC
    if (s.startsWith('//')) return res.status(400).json({ success: false, error: 'UNC paths not allowed' });
    // Reject Windows drive-letter absolutes
    if (/^[a-zA-Z]:\//.test(s) || /^[a-zA-Z]:\\/.test(incomingPath)) return res.status(400).json({ success: false, error: 'Absolute Windows paths not allowed' });
    // Strip leading slash to make relative
    if (s.startsWith('/')) s = s.substring(1);

    const modelsDir = getAbsoluteModelsPath();
    const candidate = path.join(modelsDir, s);
    // Ensure candidate path is within models dir
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(modelsDir))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!fs.existsSync(resolved)) {
      return res.json({ success: true, exists: false, path: s });
    }

    const stat = fs.statSync(resolved);
    return res.json({ success: true, exists: true, isFile: stat.isFile(), isDirectory: stat.isDirectory(), size: stat.size, path: s });
  } catch (err) {
    console.error('verify-file error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to validate a specific 3MF file
app.get('/api/validate-3mf', async (req, res) => {
  const { file } = req.query;
  
  if (!file) {
    return res.status(400).json({ error: 'File path required' });
  }

  try {
    const { parse3MF } = require('./dist-backend/utils/threeMFToJson');
  const filePath = path.isAbsolute(file) ? file : path.join(getAbsoluteModelsPath(), file);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Try to parse the 3MF file
    const metadata = await parse3MF(filePath, 0);
    
    res.json({ 
      valid: true, 
      file: file,
      size: fs.statSync(filePath).size,
      metadata: {
        name: metadata.name,
        thumbnail: metadata.thumbnail ? 'present' : 'missing',
        fileSize: metadata.fileSize
      }
    });
  } catch (error) {
    console.error('3MF validation error:', error.message);
    res.json({ 
      valid: false, 
      file: file,
      error: error.message,
      suggestion: error.message.includes('rels') || error.message.includes('relationship') 
        ? 'This 3MF file appears to be missing relationship files. Try re-exporting from your 3D software.'
        : 'This 3MF file may be corrupted or in an unsupported format.'
    });
  }
});

// Helper function to get all models
async function getAllModels(modelsDirectory) {
  const absolutePath = modelsDirectory;
  let models = [];
  
  // Function to recursively scan directories
  function scanForModels(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanForModels(fullPath);
      } else if (entry.name.endsWith('-munchie.json')) {
        // Load and parse each munchie file
        try {
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          const model = JSON.parse(fileContent);
          // Add relative path information for proper URL construction
          const relativePath = path.relative(absolutePath, fullPath);
          model.modelUrl = '/models/' + relativePath.replace(/\\/g, '/').replace('-munchie.json', '.3mf');
          
          // Set the filePath property for deletion purposes
          model.filePath = relativePath.replace('-munchie.json', '.3mf');
          
          models.push(model);
        } catch (error) {
          console.error(`Error reading model file ${fullPath}:`, error);
        }
      }
    }
  }
  
  if (fs.existsSync(absolutePath)) {
    scanForModels(absolutePath);
  }
  
  return models;
}

// API endpoint: Gemini suggestion (provider-backed with mock fallback)
app.post('/api/gemini-suggest', async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // imageBase64 is optional; validate shape if provided
    if (imageBase64 && typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'imageBase64 must be a base64 string' });
    }

    const requestedProvider = (req.body && req.body.provider) || process.env.GEMINI_PROVIDER;
    safeLog('Received /api/gemini-suggest request', { prompt, mimeType, provider: requestedProvider });

    // Try provider adapter (pass requested provider)
    let genaiResult = null;
    try {
      // Resolve relative to this file's directory so the module loads regardless of process.cwd()
      const adapterPath = path.join(__dirname, 'server-utils', 'genaiAdapter');
      const adapter = require(adapterPath);
      genaiResult = await adapter.suggest({ prompt, imageBase64, mimeType, provider: requestedProvider });
    } catch (e) {
      console.warn('GenAI adapter error or not configured:', e && e.message);
      genaiResult = null;
    }

    if (genaiResult) {
      // Normalize result
      const suggestion = {
        description: genaiResult.description || '',
        category: genaiResult.category || '',
        tags: Array.isArray(genaiResult.tags) ? genaiResult.tags : []
      };
      return res.json({ success: true, suggestion, raw: genaiResult.raw || null });
    }

    // Fallback mock behavior (previous heuristic)
    const lower = prompt.toLowerCase();
    const words = Array.from(new Set(lower.replace(/[\W_]+/g, ' ').split(/\s+/).filter(w => w.length > 3)));
    const tags = words.slice(0, 6);
    const description = `AI suggestion (mock) based on prompt: ${prompt}`;
    const category = tags.length ? tags[0] : '';

    const suggestion = {
      description,
      category,
      tags
    };

    return res.json({ success: true, suggestion, raw: null });
  } catch (err) {
    console.error('/api/gemini-suggest error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// API endpoint to delete models by ID (deletes specified file types)
app.delete('/api/models/delete', async (req, res) => {
  const { modelIds, fileTypes } = req.body;
  
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No model IDs provided' });
  }

  // Default to deleting both file types if not specified (backward compatibility)
  const typesToDelete = Array.isArray(fileTypes) && fileTypes.length > 0 ? fileTypes : ['3mf', 'json'];
  console.log(`File types to delete: ${typesToDelete.join(', ')}`);

  try {
    const modelsDir = getAbsoluteModelsPath();
    let deleted = [];
    let errors = [];

    // Scan for all models (both 3MF and STL) using the same logic as the main API
    let allModels = [];
    
    function scanForModels(directory) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            const relativePath = path.relative(modelsDir, fullPath);
            
            // Set the correct filePath based on model type
            if (entry.name.endsWith('-stl-munchie.json')) {
              // STL model
              model.filePath = relativePath.replace('-stl-munchie.json', '.stl');
            } else {
              // 3MF model
              model.filePath = relativePath.replace('-munchie.json', '.3mf');
            }
            
            allModels.push(model);
          } catch (error) {
            console.error(`Error reading model file ${fullPath}:`, error);
          }
        }
      }
    }
    
    scanForModels(modelsDir);
    
    for (const modelId of modelIds) {
      const model = allModels.find(m => m.id === modelId);
      console.log(`Processing model ID: ${modelId}`);
      
      if (!model) {
        console.log(`Model not found for ID: ${modelId}`);
        errors.push({ modelId, error: 'Model not found' });
        continue;
      }

      console.log(`Found model: ${model.name}, filePath: ${model.filePath}`);

      const filesToDelete = [];
      
      // Check if model has a valid filePath
      if (!model.filePath) {
        console.log(`Model ${modelId} has no file path`);
        errors.push({ modelId, error: 'Model has no file path' });
        continue;
      }
      
      // Add the .3mf file only if requested and model is a 3MF model
      if (typesToDelete.includes('3mf') && model.filePath.endsWith('.3mf')) {
        const threeMfPath = path.isAbsolute(model.filePath) 
          ? model.filePath 
          : path.join(modelsDir, model.filePath);
        filesToDelete.push({ type: '3mf', path: threeMfPath });
      }
      
      // Add the .stl file only if requested and model is an STL model
      if (typesToDelete.includes('stl') && (model.filePath.endsWith('.stl') || model.filePath.endsWith('.STL'))) {
        const stlPath = path.isAbsolute(model.filePath) 
          ? model.filePath 
          : path.join(modelsDir, model.filePath);
        filesToDelete.push({ type: 'stl', path: stlPath });
      }
      
      // Add the corresponding munchie.json file only if requested
      if (typesToDelete.includes('json')) {
        let jsonFileName;
        if (model.filePath.endsWith('.3mf')) {
          jsonFileName = model.filePath.replace(/\.3mf$/i, '-munchie.json');
        } else if (model.filePath.endsWith('.stl') || model.filePath.endsWith('.STL')) {
          jsonFileName = model.filePath.replace(/\.stl$/i, '-stl-munchie.json').replace(/\.STL$/i, '-stl-munchie.json');
        }
        
        if (jsonFileName) {
          const jsonPath = path.isAbsolute(jsonFileName)
            ? jsonFileName
            : path.join(modelsDir, jsonFileName);
          filesToDelete.push({ type: 'json', path: jsonPath });
        }
      }

      console.log(`Files to delete for ${modelId}:`, filesToDelete);

      // Delete each file
      for (const fileInfo of filesToDelete) {
        try {
          console.log(`Attempting to delete file: ${fileInfo.path}`);
          if (fs.existsSync(fileInfo.path)) {
            fs.unlinkSync(fileInfo.path);
            console.log(`Successfully deleted: ${fileInfo.path}`);
            deleted.push({ modelId, type: fileInfo.type, path: path.relative(modelsDir, fileInfo.path) });
          } else {
            console.log(`File does not exist: ${fileInfo.path}`);
          }
        } catch (err) {
          console.error(`Error deleting file ${fileInfo.path}:`, err.message);
          errors.push({ modelId, type: fileInfo.type, error: err.message });
        }
      }
    }

  console.log(`Deletion summary: ${deleted.length} files deleted, ${errors.length} errors`);
  safeLog('Deleted files:', deleted);
  safeLog('Errors:', errors);

    res.json({ 
      success: errors.length === 0, 
      deleted, 
      errors,
      summary: `Deleted ${deleted.length} files for ${modelIds.length} models`
    });
    
  } catch (error) {
    console.error('Error deleting models:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to create a backup of all munchie.json files
app.post('/api/backup-munchie-files', async (req, res) => {
  try {
    const modelsDir = getAbsoluteModelsPath();
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      files: [],
      // Include collections.json when present so collections are preserved in backup
      collections: undefined
    };

    // Recursively find all munchie.json files
    function findMunchieFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findMunchieFiles(fullPath);
        } else if (entry.name.endsWith('-munchie.json')) {
          try {
            const relativePath = path.relative(modelsDir, fullPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            const jsonData = JSON.parse(content);
            
            backup.files.push({
              relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
              originalPath: relativePath.replace(/\\/g, '/'), // Store original path for restoration
              content: jsonData,
              hash: jsonData.hash || null, // Use hash for matching during restore
              size: Buffer.byteLength(content, 'utf8')
            });
          } catch (error) {
            console.error(`Error reading munchie file ${fullPath}:`, error);
          }
        }
      }
    }

    findMunchieFiles(modelsDir);

    // Try to include collections.json if it exists
    try {
      const collectionsPath = path.join(process.cwd(), 'data', 'collections.json');
      if (fs.existsSync(collectionsPath)) {
        const raw = fs.readFileSync(collectionsPath, 'utf8');
        if (raw && raw.trim() !== '') {
          const parsed = JSON.parse(raw);
          // Normalize to an array in case file contains { collections: [...] }
          const cols = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.collections) ? parsed.collections : []);
          backup.collections = cols;
        } else {
          backup.collections = [];
        }
      }
    } catch (e) {
      console.warn('Failed to read collections.json for backup:', e && e.message ? e.message : e);
    }

    // Compress the backup data
    const jsonString = JSON.stringify(backup, null, 2);
    const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));

    // Set headers for file download
    const timestamp = backup.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const filename = `munchie-backup-${timestamp}.gz`;
    
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', compressed.length);
    
    res.send(compressed);
    
  const colCount = Array.isArray(backup.collections) ? backup.collections.length : 0;
  console.log(`Backup created: ${backup.files.length} munchie.json files, ${colCount} collections, ${(compressed.length / 1024).toFixed(2)} KB compressed`);
    
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to restore munchie.json files from backup
app.post('/api/restore-munchie-files', async (req, res) => {
  try {
    const { backupData, strategy = 'hash-match', collectionsStrategy = 'merge' } = req.body;
    
    if (!backupData) {
      return res.status(400).json({ success: false, error: 'No backup data provided' });
    }

    let backup;
    try {
      // Parse the backup data (should be uncompressed JSON)
      backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid backup data format' });
    }

    if (!backup.files || !Array.isArray(backup.files)) {
      return res.status(400).json({ success: false, error: 'Invalid backup structure' });
    }

    const modelsDir = getAbsoluteModelsPath();
    const results = {
      restored: [],
      skipped: [],
      errors: [],
      strategy: strategy,
      collections: { restored: 0, skipped: 0, strategy: collectionsStrategy }
    };

    // Create a map of existing 3MF files by their hashes for hash-based matching
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    const existingFiles = new Map(); // hash -> { munchieJsonPath, threeMFPath, currentHash }
    
    function mapExistingFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            mapExistingFiles(fullPath);
          } else if (entry.name.endsWith('.3mf')) {
            try {
              // Calculate the current hash of the 3MF file
              const currentHash = computeMD5(fullPath);
              const relativePath = path.relative(modelsDir, fullPath);
              
              // Find the corresponding munchie.json file
              const munchieJsonPath = fullPath.replace(/\.3mf$/i, '-munchie.json');
              
              if (fs.existsSync(munchieJsonPath)) {
                existingFiles.set(currentHash, {
                  munchieJsonPath: munchieJsonPath,
                  threeMFPath: fullPath,
                  relativeMunchieJsonPath: relativePath.replace(/\.3mf$/i, '-munchie.json').replace(/\\/g, '/'),
                  currentHash: currentHash
                });
              }
            } catch (error) {
              console.error(`Error processing 3MF file ${fullPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }

    mapExistingFiles(modelsDir);

    // Restore collections first (optional)
    try {
      if (backup.collections && Array.isArray(backup.collections)) {
        const existing = loadCollections();
        let next = [];
        if (collectionsStrategy === 'replace') {
          next = backup.collections;
        } else {
          // merge by id (prefer backup for matching IDs), append new ones
          const byId = new Map(existing.map(c => [c && c.id, c]).filter(([k]) => typeof k === 'string' && k));
          for (const c of backup.collections) {
            if (c && typeof c.id === 'string' && c.id) {
              byId.set(c.id, c);
            } else {
              // no id, assign one to avoid collisions
              const assigned = { ...c, id: makeId() };
              next.push(assigned);
            }
          }
          next = [...new Set(next.concat(Array.from(byId.values()).filter(Boolean)))];
        }
        if (!Array.isArray(next)) next = [];
        if (saveCollections(next)) {
          results.collections.restored = Array.isArray(next) ? next.length : 0;
        } else {
          results.collections.skipped = Array.isArray(backup.collections) ? backup.collections.length : 0;
        }
      }
    } catch (e) {
      console.warn('Failed to restore collections from backup:', e && e.message ? e.message : e);
      results.errors.push({ originalPath: 'collections.json', error: 'Failed to restore collections: ' + (e && e.message ? e.message : e) });
    }

    // Process each file in the backup
    for (const backupFile of backup.files) {
      try {
        let targetPath;
        let shouldRestore = false;
        let reason = '';

        if (strategy === 'hash-match' && backupFile.hash) {
          // Try to match by 3MF file hash first
          const existing = existingFiles.get(backupFile.hash);
          if (existing) {
            targetPath = existing.munchieJsonPath;
            shouldRestore = true;
            reason = `Hash match: ${backupFile.hash.substring(0, 8)}... -> ${path.basename(existing.threeMFPath)}`;
          } else {
            // If no hash match, try original path
            const originalPath = path.join(modelsDir, backupFile.originalPath);
            if (fs.existsSync(originalPath)) {
              targetPath = originalPath;
              shouldRestore = true;
              reason = 'Path match (no hash match found)';
            } else {
              results.skipped.push({
                originalPath: backupFile.originalPath,
                reason: 'No matching file found (hash or path)'
              });
              continue;
            }
          }
        } else if (strategy === 'path-match') {
          // Match by original path
          const originalPath = path.join(modelsDir, backupFile.originalPath);
          if (fs.existsSync(originalPath)) {
            targetPath = originalPath;
            shouldRestore = true;
            reason = 'Path match';
          } else {
            results.skipped.push({
              originalPath: backupFile.originalPath,
              reason: 'Original path not found'
            });
            continue;
          }
        } else {
          // Force restore to original path (create if necessary)
          targetPath = path.join(modelsDir, backupFile.originalPath);
          
          // Create directory if it doesn't exist
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          shouldRestore = true;
          reason = 'Force restore to original path';
        }

        if (shouldRestore) {
          // Protect against accidentally writing to .3mf/.stl files by remapping
          // any model file path to its corresponding munchie JSON file.
          const safeTarget = protectModelFileWrite(targetPath);

          // Write the restored file (atomic via .tmp -> rename)
          const restoredContent = JSON.stringify(backupFile.content, null, 2);
          const tmp = safeTarget + '.tmp';
          fs.writeFileSync(tmp, restoredContent, 'utf8');
          fs.renameSync(tmp, safeTarget);

          results.restored.push({
            originalPath: backupFile.originalPath,
            restoredPath: path.relative(modelsDir, safeTarget).replace(/\\/g, '/'),
            reason: reason,
            size: backupFile.size
          });
        }
        
      } catch (error) {
        results.errors.push({
          originalPath: backupFile.originalPath,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      ...results,
      summary: `Restored ${results.restored.length} files, skipped ${results.skipped.length}, ${results.errors.length} errors`
    });

  console.log(`Restore completed: ${results.restored.length} restored, ${results.skipped.length} skipped, ${results.errors.length} errors`);
  safeLog('Restore details:', results);
    
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to restore munchie.json files from uploaded backup file
app.post('/api/restore-munchie-files/upload', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No backup file provided' });
    }

  const { strategy = 'hash-match', collectionsStrategy = 'merge' } = req.body;
    let backupData;

    // Check if file is gzipped
    if (req.file.originalname.endsWith('.gz')) {
      try {
        const decompressed = zlib.gunzipSync(req.file.buffer);
        backupData = decompressed.toString('utf8');
      } catch (error) {
        return res.status(400).json({ success: false, error: 'Failed to decompress backup file' });
      }
    } else {
      backupData = req.file.buffer.toString('utf8');
    }

    let backup;
    try {
      backup = JSON.parse(backupData);
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid backup file format' });
    }

    if (!backup.files || !Array.isArray(backup.files)) {
      return res.status(400).json({ success: false, error: 'Invalid backup structure' });
    }

    // Use the same restore logic as the JSON endpoint
    const modelsDir = getAbsoluteModelsPath();
    const results = {
      restored: [],
      skipped: [],
      errors: [],
      strategy: strategy,
      collections: { restored: 0, skipped: 0, strategy: collectionsStrategy }
    };

    // Create a map of existing 3MF files by their hashes for hash-based matching
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    const existingFiles = new Map(); // hash -> { munchieJsonPath, threeMFPath, currentHash }
    
    function mapExistingFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            mapExistingFiles(fullPath);
          } else if (entry.name.endsWith('.3mf')) {
            try {
              // Calculate the current hash of the 3MF file
              const currentHash = computeMD5(fullPath);
              const relativePath = path.relative(modelsDir, fullPath);
              
              // Find the corresponding munchie.json file
              const munchieJsonPath = fullPath.replace(/\.3mf$/i, '-munchie.json');
              
              if (fs.existsSync(munchieJsonPath)) {
                existingFiles.set(currentHash, {
                  munchieJsonPath: munchieJsonPath,
                  threeMFPath: fullPath,
                  relativeMunchieJsonPath: relativePath.replace(/\.3mf$/i, '-munchie.json').replace(/\\/g, '/'),
                  currentHash: currentHash
                });
              }
            } catch (error) {
              console.error(`Error processing 3MF file ${fullPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }

    mapExistingFiles(modelsDir);

    // Restore collections first (optional)
    try {
      if (backup.collections && Array.isArray(backup.collections)) {
        const existing = loadCollections();
        let next = [];
        if (collectionsStrategy === 'replace') {
          next = backup.collections;
        } else {
          const byId = new Map(existing.map(c => [c && c.id, c]).filter(([k]) => typeof k === 'string' && k));
          for (const c of backup.collections) {
            if (c && typeof c.id === 'string' && c.id) {
              byId.set(c.id, c);
            } else {
              const assigned = { ...c, id: makeId() };
              next.push(assigned);
            }
          }
          next = [...new Set(next.concat(Array.from(byId.values()).filter(Boolean)))];
        }
        if (!Array.isArray(next)) next = [];
        if (saveCollections(next)) {
          results.collections.restored = Array.isArray(next) ? next.length : 0;
        } else {
          results.collections.skipped = Array.isArray(backup.collections) ? backup.collections.length : 0;
        }
      }
    } catch (e) {
      console.warn('Failed to restore collections from uploaded backup:', e && e.message ? e.message : e);
      results.errors.push({ originalPath: 'collections.json', error: 'Failed to restore collections: ' + (e && e.message ? e.message : e) });
    }

    // Process each file in the backup
    for (const backupFile of backup.files) {
      try {
        let targetPath;
        let shouldRestore = false;
        let reason = '';

        if (strategy === 'hash-match' && backupFile.hash) {
          // Try to match by 3MF file hash first
          const existing = existingFiles.get(backupFile.hash);
          if (existing) {
            targetPath = existing.munchieJsonPath;
            shouldRestore = true;
            reason = `Hash match: ${backupFile.hash.substring(0, 8)}... -> ${path.basename(existing.threeMFPath)}`;
          } else {
            // If no hash match, try original path
            const originalPath = path.join(modelsDir, backupFile.originalPath);
            if (fs.existsSync(originalPath)) {
              targetPath = originalPath;
              shouldRestore = true;
              reason = 'Path match (no hash match found)';
            } else {
              results.skipped.push({
                originalPath: backupFile.originalPath,
                reason: 'No matching file found (hash or path)'
              });
              continue;
            }
          }
        } else if (strategy === 'path-match') {
          // Match by original path
          const originalPath = path.join(modelsDir, backupFile.originalPath);
          if (fs.existsSync(originalPath)) {
            targetPath = originalPath;
            shouldRestore = true;
            reason = 'Path match';
          } else {
            results.skipped.push({
              originalPath: backupFile.originalPath,
              reason: 'Original path not found'
            });
            continue;
          }
        } else {
          // Force restore to original path (create if necessary)
          targetPath = path.join(modelsDir, backupFile.originalPath);
          
          // Create directory if it doesn't exist
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          shouldRestore = true;
          reason = 'Force restore to original path';
        }

        if (shouldRestore) {
          // Protect against accidentally writing to .3mf/.stl files by remapping
          // any model file path to its corresponding munchie JSON file.
          const safeTarget = protectModelFileWrite(targetPath);

          // Write the restored file atomically
          const restoredContent = JSON.stringify(backupFile.content, null, 2);
          const tmp = safeTarget + '.tmp';
          fs.writeFileSync(tmp, restoredContent, 'utf8');
          fs.renameSync(tmp, safeTarget);

          results.restored.push({
            originalPath: backupFile.originalPath,
            restoredPath: path.relative(modelsDir, safeTarget).replace(/\\/g, '/'),
            reason: reason,
            size: backupFile.size
          });
        }
        
      } catch (error) {
        results.errors.push({
          originalPath: backupFile.originalPath,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      ...results,
      summary: `Restored ${results.restored.length} files, skipped ${results.skipped.length}, ${results.errors.length} errors`
    });

  console.log(`File upload restore completed: ${results.restored.length} restored, ${results.skipped.length} skipped, ${results.errors.length} errors`);
  safeLog('File upload restore details:', results);
    
  } catch (error) {
    console.error('File upload restore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Error handler for multipart/form-data upload errors (Multer)
// This ensures clients receive JSON errors (e.g., file too large) instead of an HTML error page.
app.use(function (err, req, res, next) {
  try {
    if (err) {
      // Multer exposes a MulterError type with code property
      if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_PART_COUNT' || err.code === 'LIMIT_FILE_COUNT') {
        const message = err.message || 'File upload error';
        console.warn('Multer error during upload:', err.code || err.name, err.message);
        return res.status(413).json({ success: false, error: message, code: err.code || err.name });
      }

      // For other errors, pass through to default handler
      console.error('Unhandled error in middleware:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  } catch (handlerErr) {
    console.error('Error handler failed:', handlerErr);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
  return next();
});

// Handle React Router - catch all GET requests that aren't API or model routes
app.get(/^(?!\/api|\/models).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`3D Model Muncher backend API running on port ${PORT}`);
    console.log(`Frontend served from build directory`);
  });
}

// Export app for testing (so tests can import and run requests against it)
module.exports = app;
