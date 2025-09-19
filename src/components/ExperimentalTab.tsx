import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Bot, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Sheet, SheetContent, SheetHeader } from "./ui/sheet";
import { toast } from 'sonner';
import { Separator } from "./ui/separator";

type ModelEntry = {
  id?: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  filePath?: string;
  modelUrl?: string;
  tags?: string[];
};

import type { Category } from '../types/category';

interface ExperimentalTabProps {
  categories?: Category[];
}

export default function ExperimentalTab({ categories: propCategories }: ExperimentalTabProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  // When no search query is present, show a limited number of items to avoid rendering huge lists.
  const INITIAL_LIMIT = 25;
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ModelEntry | null>(null);

  useEffect(() => {
    // Fetch models from backend API. Expecting `/api/models` to return an array of model metadata objects.
    setLoading(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        // Normalize to ModelEntry where possible
        if (Array.isArray(data)) {
          const normalized = data.map((m: any) => ({
            id: m.id ?? m.name ?? undefined,
            name: m.name ?? m.title ?? "",
            description: m.description ?? m.desc ?? "",
            thumbnail: m.thumbnail ?? m.image ?? m.preview ?? undefined,
            category: m.category ?? m.categories?.[0] ?? "",
            // preserve underlying file path / modelUrl when provided so we can derive munchie.json
            filePath: m.filePath ?? m.file ?? undefined,
            modelUrl: m.modelUrl ?? m.url ?? undefined,
            tags: Array.isArray(m.tags) ? m.tags : typeof m.tags === "string" && m.tags ? m.tags.split(",").map((s: string) => s.trim()) : [],
          }));
          setModels(normalized);
        } else {
          setModels([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch models", err);
        setModels([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.name.toLowerCase().includes(q));
  }, [models, query]);

  // Visible list obeys the initial limit when there's no search query and showAll is false
  const visibleModels = useMemo(() => {
    const q = query.trim();
    if (!q && !showAll && filtered.length > INITIAL_LIMIT) {
      return filtered.slice(0, INITIAL_LIMIT);
    }
    return filtered;
  }, [filtered, query, showAll]);

  // ...existing code...
  // Gemini prompt state and handler
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [geminiResult, setGeminiResult] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  // Provider selection: 'gemini' (Google), 'openai', or 'mock'
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'mock'>('mock');
  // Prompt options determine which supporting fields are sent to the provider
  const [promptOption, setPromptOption] = useState<'image_description' | 'translate_description' | 'rewrite_description'>('image_description');

  // Editable fields shown in the dialog
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Suggestions returned by Gemini (structured if backend provides it)
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionTags, setSuggestionTags] = useState<string[]>([]);
  // Data URL of the resized image for a small preview in the UI
  const [resizedPreview, setResizedPreview] = useState<string | null>(null);

  // Use categories passed from SettingsPage when available, otherwise derive from models
  // Include the current editCategory and any suggestionCategory so Update Fields will be selectable/displayed
  const categories = useMemo(() => {
    const src = propCategories && propCategories.length > 0
      ? propCategories.map(c => c.label)
      : Array.from(new Set(models.map(m => m.category).filter(Boolean))) as string[];
    // Always ensure there is an 'Uncategorized' option and keep it first
    const set = new Set<string>();
    set.add('Uncategorized');
    for (const s of src) {
      if (s && s.trim() && s !== 'Uncategorized') set.add(s);
    }
    if (editCategory && editCategory.trim() && editCategory !== 'Uncategorized') set.add(editCategory);
    if (suggestionCategory && suggestionCategory.trim() && suggestionCategory !== 'Uncategorized') set.add(suggestionCategory);
    return Array.from(set);
  }, [models, propCategories, editCategory, suggestionCategory]);

  // Resize an image Blob to a square canvas (512x512 by default) and return a data URL
  async function resizeImageBlobToDataUrl(blob: Blob, targetW = 512, targetH = 512, mimeType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');

          // Fill background white to avoid transparent PNGs turning dark in some viewers
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);

          const iw = img.width;
          const ih = img.height;
          const ratio = Math.min(targetW / iw, targetH / ih);
          const nw = Math.round(iw * ratio);
          const nh = Math.round(ih * ratio);
          const dx = Math.round((targetW - nw) / 2);
          const dy = Math.round((targetH - nh) / 2);

          ctx.drawImage(img, 0, 0, iw, ih, dx, dy, nw, nh);

          const outMime = mimeType && (mimeType === 'image/jpeg' || mimeType === 'image/png') ? mimeType : 'image/png';
          const dataUrl = canvas.toDataURL(outMime);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for resizing'));
      };
      img.src = url;
    });
  }

  async function handleGeminiSuggest() {
    setGeminiLoading(true);
    setGeminiError("");
    setGeminiResult("");
    // If user selected the local Mock provider, produce a realistic sample suggestion
    if (provider === 'mock') {
      // clear previous suggestions
      setSuggestionDescription("");
      setSuggestionCategory("");
      setSuggestionTags([]);
      try {
        // Try to fetch and resize the thumbnail so the mock flow also shows the "image sent" preview
        try {
          const imgUrl = selected?.thumbnail ?? "";
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            const imgBlob = await imgRes.blob();
            const resizedDataUrl = await resizeImageBlobToDataUrl(imgBlob, 512, 512, imgBlob.type);
            setResizedPreview(resizedDataUrl);
          }
        } catch (e) {
          // non-fatal: ignore preview errors for mock
        }
        // simulate network/processing latency
        await new Promise((res) => setTimeout(res, 700));
        const sampleDescription = `Munchie the mascot a whimsical creature features a spherical, textured body resembling a spiky puffball, accented by large, striking eyes and a tiny, unassuming mouth. Designed as a charming decorative piece, it brings a playful and friendly presence to any desk or shelf. Its distinctive look makes it a unique collectible or a delightful gift.`;
        const sampleCategory = "Figurine";
        const sampleTags = ["monster", "creature", "toy"];
        setSuggestionDescription(sampleDescription);
        setSuggestionCategory(sampleCategory);
        setSuggestionTags(sampleTags);
        setGeminiResult(sampleDescription);
      } catch (e:any) {
        setGeminiError(e?.message ?? 'Mock suggestion failed');
      } finally {
        setGeminiLoading(false);
      }
      return;
    }
    try {
      // Fetch image as base64
  const imgUrl = selected?.thumbnail ?? "";
  // Don't send the generic placeholder to Gemini — treat it as missing
  const PLACEHOLDER = '/images/placeholder.svg';
  if (!imgUrl || imgUrl === PLACEHOLDER) throw new Error("Model requires a thumbnail for AI assistance");
      const imgRes = await fetch(imgUrl);
      const imgBlob = await imgRes.blob();
      // Resize to 512x512 before sending to the backend to save bandwidth and keep consistent input size
      const resizedDataUrl = await resizeImageBlobToDataUrl(imgBlob, 512, 512, imgBlob.type);
      // store preview for UI
      setResizedPreview(resizedDataUrl);
      const base64 = resizedDataUrl.split(',')[1] ?? '';
      // Build payload based on selected prompt option
      const filename = selected?.name ?? selected?.id ?? "";
      const payloadBody: any = {
        provider,
        promptOption,
        imageBase64: base64,
        mimeType: imgBlob.type,
      };
      if (promptOption === 'image_description') {
        payloadBody.filename = filename;
        // If the model already has a description, include it as context and ask the model to improve or incorporate it.
        const existingDesc = selected?.description ?? "";
        if (existingDesc && existingDesc.trim().length > 0) {
          payloadBody.prompt = geminiPrompt || `Create a printable model description for the file ${filename} using the image. Use and improve the existing description where helpful. Existing description:\n\n"${existingDesc}"`;
        } else {
          payloadBody.prompt = geminiPrompt || `Create a printable model description for the file ${filename} using the image.`;
        }
      } else if (promptOption === 'translate_description') {
        payloadBody.filename = filename;
        payloadBody.description = selected?.description ?? "";
        payloadBody.prompt = geminiPrompt || `Translate the following model description into clear, user-facing language:\n\n${selected?.description ?? ''}`;
      } else if (promptOption === 'rewrite_description') {
        payloadBody.filename = filename;
        payloadBody.description = selected?.description ?? "";
        payloadBody.prompt = geminiPrompt || `Rewrite the following model description to be clear, concise, and user-focused:\n\n${selected?.description ?? ''}`;
      }

      // Log final constructed payload/prompt for debugging (browser console)
      try {
        // Print a compact preview: option, filename, and prompt text (if present)
        console.log('[GenAI] payload:', {
          promptOption: payloadBody.promptOption,
          filename: payloadBody.filename,
          prompt: payloadBody.prompt,
          description: payloadBody.description,
          tags: payloadBody.tags,
          mimeType: payloadBody.mimeType,
        });
      } catch (e) {
        // ignore logging errors
      }

      // Send payload to backend
      const res = await fetch("/api/gemini-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });
      if (!res.ok) throw new Error("Gemini API error");
      const data = await res.json();
      // Accept either a plain text response or a structured suggestion object
      setGeminiResult(data.text ?? data.result ?? "No suggestion returned.");
      // If backend returns structured suggestion use it
      if (data.suggestion) {
        setSuggestionDescription(data.suggestion.description ?? "");
        setSuggestionCategory(data.suggestion.category ?? "");
        setSuggestionTags(Array.isArray(data.suggestion.tags) ? data.suggestion.tags : (typeof data.suggestion.tags === 'string' && data.suggestion.tags ? data.suggestion.tags.split(',').map((s: string)=>s.trim()) : []));
      } else {
        // try to populate suggestionDescription from text
        setSuggestionDescription(data.text ?? "");
        setSuggestionCategory("");
        setSuggestionTags([]);
      }
    } catch (err: any) {
      setGeminiError(err?.message ?? "Unknown error");
    }
    finally {
      setGeminiLoading(false);
    }
  }

  // Initialize editable fields when a model is selected
  useEffect(() => {
    // clear previous preview and any Gemini state when selection changes
    setResizedPreview(null);
    setGeminiError("");
    setGeminiResult("");
    setSuggestionDescription("");
    setSuggestionCategory("");
    setSuggestionTags([]);
    setGeminiLoading(false);

    if (!selected) {
      setEditDescription("");
      setEditCategory("");
      setEditTags([]);
      return;
    }

    setEditDescription(selected.description ?? "");
    setEditTags(selected.tags ? selected.tags.slice() : []);

    // Default empty or missing categories to 'Uncategorized'
    const defaultCategory = selected.category && selected.category.trim() ? selected.category : 'Uncategorized';

    // Try to read the model's munchie.json to get the authoritative category
    (async () => {
      try {
        // Build raw relative candidate paths (no encoding yet). We'll URL-encode once when calling the API.
        const candidatesRaw: string[] = [];
        const seen = new Set<string>();

        // If filePath is available, derive the json path from it
        const fp = (selected as any).filePath || (selected as any).file || undefined;
        const mu = (selected as any).modelUrl || (selected as any).url || undefined;
        if (fp && typeof fp === 'string') {
          let rel = fp.replace(/\\/g, '/');
          rel = rel.replace(/^\/?models\//, '');
          if (rel.endsWith('.3mf')) rel = rel.replace(/\.3mf$/i, '-munchie.json');
          else if (/\.stl$/i.test(rel)) rel = rel.replace(/\.stl$/i, '-stl-munchie.json');
          else if (!(rel.endsWith('-munchie.json') || rel.endsWith('-stl-munchie.json'))) rel = `${rel}-munchie.json`;
          if (!seen.has(rel)) { seen.add(rel); candidatesRaw.push(rel); }
        }

        // If modelUrl is present, derive from it
        if (mu && typeof mu === 'string') {
          let rel = mu.replace(/^\/?models\//, '');
          if (rel.endsWith('.3mf')) rel = rel.replace(/\.3mf$/i, '-munchie.json');
          else if (/\.stl$/i.test(rel)) rel = rel.replace(/\.stl$/i, '-stl-munchie.json');
          else if (!(rel.endsWith('-munchie.json') || rel.endsWith('-stl-munchie.json'))) rel = `${rel}-munchie.json`;
          if (!seen.has(rel)) { seen.add(rel); candidatesRaw.push(rel); }
        }

        // Fallback to name-based candidates (keep for compatibility)
        const nameBase = selected.name || selected.id || '';
        if (nameBase) {
          const a = `${nameBase}-munchie.json`;
          const b = `${nameBase}-stl-munchie.json`;
          if (!seen.has(a)) { seen.add(a); candidatesRaw.push(a); }
          if (!seen.has(b)) { seen.add(b); candidatesRaw.push(b); }
        }

        let fetched: any = null;
        for (const rel of candidatesRaw) {
          try {
            // Use server API which resolves and validates file paths securely; encode once here
            const url = `/api/load-model?filePath=${encodeURIComponent(rel)}`;
            const res = await fetch(url);
            if (!res.ok) continue;
            fetched = await res.json();
            if (fetched) break;
          } catch (e) {
            // ignore and try next
          }
        }

        if (fetched) {
          const cat = fetched.category ?? (Array.isArray(fetched.categories) ? fetched.categories[0] : undefined);
          setEditCategory(cat && cat.toString().trim() ? cat.toString() : defaultCategory);
        } else {
          setEditCategory(defaultCategory);
        }
      } catch (e) {
        setEditCategory(defaultCategory);
      }
    })();
  }, [selected]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Experimental Features</h2>

      <div className="prose max-w-none text-sm text-foreground/90">
        <p>
          This area contains experimental settings and features which may change, be
          removed, or behave unexpectedly. Use with caution. Experimental options
          are not guaranteed to be stable and may be modified or deleted in future
          releases.
        </p>
        <p>
          If you rely on any functionality here consider backing up your data before
          enabling or changing settings. Feedback is welcome — please file issues or
          feature requests in the project repository.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3>AI Metadata Generation</h3>
        <label className="block text-sm font-medium text-foreground/90">Search models by name</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              // `Input` is a forwarded ref component in the UI library; cast to any to satisfy the HTML ref type
              ref={inputRef as any}
              placeholder="Type model name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary input-sm"
            />
            {query && (
              <button
                aria-label="Clear search"
                title="Clear"
                className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{loading ? "Loading..." : `${filtered.length} results`}</div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2">
          {filtered.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground">No models found.</div>
          ) : (
            <>
            {visibleModels.map((m) => (
              <button
                key={m.id ?? m.name}
                onClick={() => setSelected(m)}
                className="flex items-center gap-3 rounded border p-2 text-left hover:bg-muted"
              >
                <img
                  src={m.thumbnail ?? "/public/demo-data/images/placeholder.svg"}
                  alt={m.name}
                  className="h-12 w-12 object-cover rounded"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/images/placeholder.svg";
                  }}
                />
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate w-72">{m.description}</div>
                </div>
              </button>
            ))}
            {/* Show more / show less control when we have a limited preview */}
            {filtered.length > INITIAL_LIMIT && (
              <div className="flex items-center gap-2 mt-2">
                <div className="text-sm text-muted-foreground">Showing {visibleModels.length} of {filtered.length} results</div>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => setShowAll((s) => !s)}>{showAll ? 'Show less' : 'Show more'}</Button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected && (
          <SheetContent className="w-full sm:max-w-2xl">
            <SheetHeader className="border-b p-4 sticky top-0 bg-background/95 backdrop-blur-sm z-20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold px-2">{selected?.name}</h3>
                <button aria-label="Close" title="Close" className="btn btn-ghost p-2" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>

            <ScrollArea className="min-h-0">
              <div className="h-full p-4 space-y-4">
                {/* Use the project's public placeholder path; ensure the img onError doesn't point back to itself repeatedly. */}
                <img
                  src={selected.thumbnail ?? "/images/placeholder.svg"}
                  alt={selected.name}
                  className="w-64 rounded object-cover"
                  onError={(e) => {
                    // If loading the thumbnail fails, show the local placeholder and mark the element as handled
                    const el = e.currentTarget as HTMLImageElement;
                    if (!el.dataset.fallback) {
                      el.dataset.fallback = '1';
                      el.src = '/images/placeholder.svg';
                    }
                  }}
                />
                <label className="text-sm font-medium">Description</label>
                <div className="p-0">
                  <ScrollArea className="">
                    <div className="max-h-[300px]">
                      <Textarea
                        value={editDescription}
                        onChange={e => setEditDescription((e.target as HTMLTextAreaElement).value)}
                        className=""
                        placeholder="Edit description here or use Gemini suggestion"
                      />
                    </div>
                  </ScrollArea>
                </div>

                <label className="text-sm font-medium">Category</label>
                <div className="flex gap-2 mt-2 mb-4">
                  {/* Bind the select directly to editCategory and ensure a value is always present.
                      We force a default of 'Uncategorized' elsewhere, so there is no '(none)' option. */}
                  <Select value={editCategory || 'Uncategorized'} onValueChange={(v: string) => setEditCategory(v)}>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add New Tag - matches ModelDetailsDrawer styling */}
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={e => setTagInput((e.target as HTMLInputElement).value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = tagInput.trim();
                        if (!trimmed) return;
                        setEditTags((t) => {
                          const lower = trimmed.toLowerCase();
                          if (t.some(x => x.toLowerCase() === lower)) return t;
                          return [...t, trimmed];
                        });
                        setTagInput('');
                      }
                    }}
                    className="flex-1 input-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const trimmed = tagInput.trim();
                      if (!trimmed) return;
                      setEditTags((t) => {
                        const lower = trimmed.toLowerCase();
                        if (t.some(x => x.toLowerCase() === lower)) return t;
                        return [...t, trimmed];
                      });
                      setTagInput('');
                    }}
                    disabled={!tagInput.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {/* Tag chips - show edited tags if present, otherwise show the original tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(editTags.length ? editTags : (selected.tags ?? [])).map((tag, index) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      className="text-sm gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => setEditTags((t) => t.filter(x => x !== tag))}
                    >
                      {tag}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>


                {/* Generative AI suggestion area */}
                <div className="mt-2">
                  <Separator className="mb-4"/>
                  <h3>Generative AI</h3>
                  <p className="text-sm text-muted-foreground">Use AI to generate or improve model metadata. Select a provider, choose a prompt template, or provide a custom prompt.</p>
                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="text-sm font-medium">Provider</label>
                        <div className="mt-2">
                          <Select value={provider} onValueChange={(v: string) => setProvider(v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mock">Mock (local test)</SelectItem>
                              <SelectItem value="gemini">Google Gemini</SelectItem>
                              {/* <SelectItem value="openai">OpenAI</SelectItem> */}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium">Prompt Template</label>
                        <div className="mt-1">
                          <Select value={promptOption} onValueChange={(v: string) => setPromptOption(v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="image_description">Create description from image</SelectItem>
                              <SelectItem value="translate_description">Translate this description</SelectItem>
                              <SelectItem value="rewrite_description">Rewrite description</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium">Prompt Override</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Input placeholder="Describe what you want Gemini to do (or leave blank if using template)" value={geminiPrompt} onChange={e=>setGeminiPrompt((e.target as HTMLInputElement).value)} className="flex-1 input-sm" />
                          <Button size="sm" variant="default" onClick={handleGeminiSuggest} disabled={geminiLoading}>
                            <Bot />
                            {geminiLoading ? 'Sent...' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {geminiError && <div className="mt-2 text-red-600 dark:text-red-400">{geminiError}</div>}

                  {(suggestionDescription || suggestionCategory || suggestionTags.length>0 || geminiResult || geminiLoading) && (
                    <div className="mt-3 p-3 rounded bg-muted text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Gemini Suggestion</div>
                          <div className="flex items-center gap-3">
                            {resizedPreview && (
                              <div className="flex items-center gap-2">
                                <img src={resizedPreview} alt="Resized preview" className="h-12 w-12 rounded object-cover border" />
                                <div className="text-xs text-muted-foreground">Image sent</div>
                              </div>
                            )}
                            {geminiLoading && (
                          <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                            )}
                          </div>
                      </div>

                      {geminiLoading ? (
                        <div className="flex items-center gap-2 justify-center p-6">
                          <svg className="animate-spin h-6 w-6 text-muted-foreground" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          <div className="text-sm text-muted-foreground">Generating…</div>
                        </div>
                      ) : (
                        <>
                          {suggestionDescription ? <div className="mt-2 whitespace-pre-line">{suggestionDescription}</div> : geminiResult ? <div className="mt-2 whitespace-pre-line">{geminiResult}</div> : null}
                          {suggestionCategory && <div className="mt-2"><span className="font-medium">Category:</span> {suggestionCategory} <div className="text-muted-foreground">Must manually add new categories</div></div>}
                          {suggestionTags.length>0 && <div className="mt-2"><span className="font-medium">Tags:</span> {suggestionTags.join(', ')}</div>}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="default" onClick={()=>{
                              if(suggestionDescription) setEditDescription(suggestionDescription);
                              if(suggestionCategory) setEditCategory(suggestionCategory);
                              if(suggestionTags.length>0) setEditTags(suggestionTags);
                            }}>Update Fields</Button>
                            <Button size="sm" variant="ghost" onClick={()=>{ setSuggestionDescription(''); setSuggestionCategory(''); setSuggestionTags([]); setGeminiResult(''); }}>Clear</Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="prose max-w-none text-sm text-foreground/90">
                  <p>Saving data writes to the munchie.json in a separate section to not override anything.</p>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="default" onClick={async ()=>{
                    if(saving) return; // prevent duplicate saves while request is in-flight
                    setSaving(true);
                    setGeminiError('');
                    const toastId = toast.loading('Saving experiment data...');
                    try{
                      const payload = {
                        modelId: selected?.id ?? selected?.name,
                        overwrite: true, // request backend to overwrite any existing experiment entry for this model
                        experiment: {
                          description: editDescription || selected?.description || "",
                          category: editCategory || selected?.category || "",
                          tags: editTags.length>0 ? editTags : (selected?.tags ?? []),
                          source: 'gemini',
                        }
                      ,
                        // Also send topLevelTags explicitly so server can update the munchie.json top-level tags
                        topLevelTags: editTags.length>0 ? editTags : (selected?.tags ?? [])
                      };
                      const r = await fetch('/api/save-experiment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                      if(!r.ok) throw new Error('Save failed');
                      await r.json();
                      setGeminiResult('Experiment data saved to munchie.json');
                      toast.success('Experiment saved', { id: toastId });
                    }catch(e:any){ setGeminiError(e?.message ?? 'Save error');
                      try { toast.error(e?.message ?? 'Save error'); } catch {}
                    }
                    finally{ setSaving(false); }
                  }} disabled={saving}>{saving ? 'Saving...' : 'Save Experiment Data'}</Button>
                  <Button size="sm" variant="ghost" onClick={()=>{ setEditDescription(''); setEditCategory(''); setEditTags([]); }}>Reset</Button>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
