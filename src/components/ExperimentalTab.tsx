import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Sheet, SheetContent, SheetHeader } from "./ui/sheet";

type ModelEntry = {
  id?: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
};

export default function ExperimentalTab() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
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

  const categories = useMemo(() => Array.from(new Set(models.map(m => m.category).filter(Boolean))) as string[], [models]);
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

  // Suggestions returned by Gemini (structured if backend provides it)
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionTags, setSuggestionTags] = useState<string[]>([]);
  // Data URL of the resized image for a small preview in the UI
  const [resizedPreview, setResizedPreview] = useState<string | null>(null);

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
        const sampleDescription = `A fun, low-poly stylized sponge character designed for easy printing with minimal supports. Features rounded geometry, integrated eyes, and a flat base for stable printing. Consider printing at 0.2mm layer height and 15% infill for a balance of detail and speed.`;
        const sampleCategory = "Characters";
        const sampleTags = ["spongebob", "character", "low-poly", "printable"];
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
      if (!imgUrl) throw new Error("No thumbnail available");
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
    // clear previous preview when selection changes
    setResizedPreview(null);
    if (selected) {
      setEditDescription(selected.description ?? "");
      setEditCategory(selected.category ?? "");
      setEditTags(selected.tags ? selected.tags.slice() : []);
    } else {
      setEditDescription("");
      setEditCategory("");
      setEditTags([]);
    }
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

      <div className="space-y-2">
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
            filtered.map((m) => (
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
                    // fallback to placeholder
                    (e.currentTarget as HTMLImageElement).src = "/images/placeholder.svg";
                  }}
                />
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate w-72">{m.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Drawer (replaces modal) */}
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
            <div className="h-full p-4 space-y-6">
                <img src={selected.thumbnail ?? "/images/placeholder.svg"} alt={selected.name} className="w-64 rounded object-cover" />
                <label className="text-sm font-medium">Description</label>
                <div className="flex items-start gap-2">
                  <div className="">
                    <div className="p-0">
                      <ScrollArea className="">
                        <div className="">
                          <Textarea
                            value={editDescription}
                            onChange={e => setEditDescription((e.target as HTMLTextAreaElement).value)}
                            className=""
                            placeholder="Edit description here or use Gemini suggestion"
                          />
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-sm font-medium">Category</label>
                      <div style={{minWidth: 180}}>
                        {(() => {
                          const current = editCategory || selected.category || "";
                          const radixValue = current === "" ? "__none" : current;
                          return (
                            <Select value={radixValue} onValueChange={(v: string) => setEditCategory(v === "__none" ? "" : v)}>
                              <SelectTrigger size="sm">
                                <SelectValue placeholder="(none)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">(none)</SelectItem>
                                {categories.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="text-sm font-medium">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(editTags.length ? editTags : (selected.tags ?? [])).map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs rounded bg-muted cursor-pointer" onClick={()=> setEditTags((t)=>t.filter(x=>x!==tag))}>{tag} ×</span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Add tag" value={tagInput} onChange={e=>setTagInput((e.target as HTMLInputElement).value)} className="input-sm" />
                        <Button size="sm" variant="ghost" onClick={()=>{ if(tagInput.trim()){ setEditTags((t)=>Array.from(new Set([...t, tagInput.trim()]))) ; setTagInput(""); } }}>Add</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gemini suggestion area */}
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Generative AI</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div style={{minWidth: 140}}>
                        <Select value={provider} onValueChange={(v: string) => setProvider(v as any)}>
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mock">Mock (local)</SelectItem>
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{minWidth: 220}}>
                        <Select value={promptOption} onValueChange={(v: string) => setPromptOption(v as any)}>
                          <SelectTrigger size="sm">
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

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Describe what you want Gemini to do (or leave blank to auto)" value={geminiPrompt} onChange={e=>setGeminiPrompt((e.target as HTMLInputElement).value)} className="flex-1 input-sm" />
                        <Button size="sm" variant="default" onClick={handleGeminiSuggest} disabled={geminiLoading}>{geminiLoading ? 'Suggesting...' : 'Suggest'}</Button>
                      </div>
                    </div>
                  </div>
                  {geminiError && <div className="mt-2 text-xs text-red-500">{geminiError}</div>}

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
                          <div className="text-sm text-muted-foreground">Suggesting…</div>
                        </div>
                      ) : (
                        <>
                          {suggestionDescription ? <div className="mt-2 whitespace-pre-line">{suggestionDescription}</div> : geminiResult ? <div className="mt-2 whitespace-pre-line">{geminiResult}</div> : null}
                          {suggestionCategory && <div className="mt-2"><span className="font-medium">Category:</span> {suggestionCategory}</div>}
                          {suggestionTags.length>0 && <div className="mt-2"><span className="font-medium">Tags:</span> {suggestionTags.join(', ')}</div>}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="default" onClick={()=>{
                              if(suggestionDescription) setEditDescription(suggestionDescription);
                              if(suggestionCategory) setEditCategory(suggestionCategory);
                              if(suggestionTags.length>0) setEditTags(suggestionTags);
                            }}>Apply</Button>
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
                    try{
                      const payload = {
                        modelId: selected?.id ?? selected?.name,
                        experiment: {
                          description: editDescription || selected?.description || "",
                          category: editCategory || selected?.category || "",
                          tags: editTags.length>0 ? editTags : (selected?.tags ?? []),
                          source: 'gemini',
                          createdAt: new Date().toISOString(),
                        }
                      };
                      const r = await fetch('/api/save-experiment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                      if(!r.ok) throw new Error('Save failed');
                      await r.json();
                      setGeminiResult('Experiment saved');
                    }catch(e:any){ setGeminiError(e?.message ?? 'Save error'); }
                  }}>Save Experiment Data</Button>
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
