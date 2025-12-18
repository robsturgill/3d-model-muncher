import { useCallback, useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { FolderPlus, Trash } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from 'sonner';
import { RendererPool } from '../utils/rendererPool';
import TagsInput from './TagsInput';
import { ConfigManager } from '../utils/configManager';

interface ModelUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

export const ModelUploadDialog: React.FC<ModelUploadDialogProps> = ({ isOpen, onClose, onUploaded }: ModelUploadDialogProps) => {
  const [files, setFiles] = useState<File[]>([] as File[]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [folders, setFolders] = useState<string[]>(['uploads']);
  const [singleDestination, setSingleDestination] = useState<string>('uploads');
  const [showCreateFolderInput, setShowCreateFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [generatePreviews, setGeneratePreviews] = useState<boolean>(true);
  const [previewGenerating, setPreviewGenerating] = useState<boolean>(false);
  const [previewProgress, setPreviewProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [availableCategories, setAvailableCategories] = useState<string[]>(['Uncategorized']);
  const [selectedCategory, setSelectedCategory] = useState<string>('Uncategorized');
  const [applyTags, setApplyTags] = useState<string[]>([]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    const arr = Array.from(dt.files as FileList);
    
    // Filter out .gcode.3mf files and show helpful message
    const gcodeArchives: File[] = [];
    const validFiles: File[] = [];
    
    arr.forEach((f: File) => {
      const lowerName = f.name.toLowerCase();
      if (lowerName.endsWith('.gcode.3mf') || lowerName.endsWith('.3mf.gcode')) {
        gcodeArchives.push(f);
      } else if (/\.3mf$/i.test(f.name) || /\.stl$/i.test(f.name)) {
        validFiles.push(f);
      }
    });
    
    if (gcodeArchives.length > 0) {
      const fileNames = gcodeArchives.map(f => f.name).join(', ');
      toast.error(`G-code archives (${fileNames}) should be uploaded via the G-code analysis dialog in the model details panel`);
    }
    
    if (validFiles.length === 0 && gcodeArchives.length === 0) {
      toast.error('Please drop .3mf or .stl files only');
      return;
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => ([...prev, ...validFiles]));
    }
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files || []) as File[];
    
    // Filter out .gcode.3mf files and show helpful message
    const gcodeArchives: File[] = [];
    const validFiles: File[] = [];
    
    arr.forEach((f: File) => {
      const lowerName = f.name.toLowerCase();
      if (lowerName.endsWith('.gcode.3mf') || lowerName.endsWith('.3mf.gcode')) {
        gcodeArchives.push(f);
      } else if (/\.3mf$/i.test(f.name) || /\.stl$/i.test(f.name)) {
        validFiles.push(f);
      }
    });
    
    if (gcodeArchives.length > 0) {
      const fileNames = gcodeArchives.map(f => f.name).join(', ');
      toast.error(`G-code archives (${fileNames}) should be uploaded via the G-code analysis dialog in the model details panel`);
    }
    
    if (validFiles.length === 0 && gcodeArchives.length === 0) {
      toast.error('Please select .3mf or .stl files');
      return;
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => ([...prev, ...validFiles]));
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function applyCategoryAndTagsTo(relPath: string, candidateModel: any | null) {
  const trimmedCat = (selectedCategory || 'Uncategorized').trim() || 'Uncategorized';
  const hasTags = Array.isArray(applyTags) && applyTags.length > 0;

    let jsonPath = '';
    if (relPath.toLowerCase().endsWith('.3mf')) jsonPath = relPath.replace(/\.3mf$/i, '-munchie.json');
    else if (relPath.toLowerCase().endsWith('.stl')) jsonPath = relPath.replace(/\.stl$/i, '-stl-munchie.json');
    else jsonPath = `${relPath}-munchie.json`;

  const changes: any = { filePath: jsonPath, category: trimmedCat };
    if (hasTags) {
      const baseTags: string[] = Array.isArray(candidateModel?.tags) ? candidateModel.tags : [];
      const union = new Map<string, string>();
      for (const t of baseTags) if (typeof t === 'string' && t.trim()) union.set(t.trim().toLowerCase(), t.trim());
      for (const t of applyTags) if (typeof t === 'string' && t.trim()) union.set(t.trim().toLowerCase(), t.trim());
      changes.tags = Array.from(union.values());
    }

    try {
      const saveResp = await fetch('/api/save-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      if (!saveResp.ok) {
        const txt = await saveResp.text();
        console.warn('Failed to save category/tags for', jsonPath, txt);
      }
    } catch (e) {
      console.warn('Failed to save category/tags for', jsonPath, e);
    }
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }
    setIsUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);

    const destArray: string[] = files.map(() => singleDestination || 'uploads');
    fd.append('destinations', JSON.stringify(destArray));

    try {
      const resp = await fetch('/api/upload-models', { method: 'POST', body: fd });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Upload failed');
      }
      const data = await resp.json();
      toast.success(`Uploaded ${(Array.isArray(data.saved) ? data.saved.length : files.length)} files`);

      const savedPaths: string[] = Array.isArray(data.saved) ? data.saved : [];

      if (generatePreviews && savedPaths.length > 0) {
        setPreviewGenerating(true);
        setPreviewProgress({ current: 0, total: savedPaths.length });
        try {
          const modelsResp = await fetch('/api/models');
          const allModels = modelsResp.ok ? await modelsResp.json() : [];

          for (let i = 0; i < savedPaths.length; i++) {
            const rel = savedPaths[i];
            try {
              const candidate = allModels.find((m: any) => {
                if (!m) return false;
                // Normalize paths: convert backslashes to forward slashes and lowercase for comparison
                const normalizedRel = rel.replace(/\\/g, '/').toLowerCase();
                
                // Match by filePath (exact match after normalization)
                if (m.filePath) {
                  const normalizedFilePath = m.filePath.replace(/\\/g, '/').toLowerCase();
                  if (normalizedFilePath === normalizedRel) return true;
                }
                
                // Match by modelUrl (endsWith match after normalization)
                if (m.modelUrl) {
                  const normalizedModelUrl = m.modelUrl.replace(/\\/g, '/').toLowerCase();
                  if (normalizedModelUrl.endsWith(normalizedRel)) return true;
                }
                
                return false;
              }) || null;

              await applyCategoryAndTagsTo(rel, candidate);

              const hasParsed = candidate && Array.isArray(candidate.parsedImages) && candidate.parsedImages.length > 0;
              const hasUser = candidate && candidate.userDefined && Array.isArray(candidate.userDefined.images) && candidate.userDefined.images.length > 0;
              if (!hasParsed && !hasUser) {
                const modelUrl = candidate?.modelUrl;
                if (modelUrl) {
                  let dataUrl: string | null = null;
                  try { dataUrl = await RendererPool.captureModel(modelUrl); } catch (e) { console.warn('Capture failed for', modelUrl, e); }
                  if (dataUrl) {
                    let jsonPath = '';
                    if (rel.toLowerCase().endsWith('.3mf')) jsonPath = rel.replace(/\.3mf$/i, '-munchie.json');
                    else if (rel.toLowerCase().endsWith('.stl')) jsonPath = rel.replace(/\.stl$/i, '-stl-munchie.json');
                    else jsonPath = `${rel}-munchie.json`;

                    const payload: any = { filePath: jsonPath, userDefined: { images: [dataUrl], imageOrder: ['user:0'], thumbnail: 'user:0' } };
                    try {
                      const saveResp = await fetch('/api/save-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      if (!saveResp.ok) {
                        const txt = await saveResp.text();
                        console.warn('Failed to save captured image for', jsonPath, txt);
                      }
                    } catch (e) {
                      console.warn('Failed to save captured image for', jsonPath, e);
                    }
                  }
                }
              }

              setPreviewProgress(prev => ({ ...prev, current: prev.current + 1 }));
            } catch (e) {
              console.warn('Per-file post-upload handling error', e);
              setPreviewProgress(prev => ({ ...prev, current: prev.current + 1 }));
            }
          }
        } catch (e) {
          console.warn('Post-upload handling failed:', e);
        } finally {
          setPreviewGenerating(false);
          await new Promise(res => setTimeout(res, 300));
        }
      } else if (savedPaths.length > 0) {
        try {
          const modelsResp = await fetch('/api/models');
          const allModels = modelsResp.ok ? await modelsResp.json() : [];
          for (const rel of savedPaths) {
            // Use case-insensitive comparison for file systems like Windows/macOS
            const candidate = allModels.find((m: any) => {
              if (!m) return false;
              const normalizedRel = rel.replace(/\\/g, '/').toLowerCase();
              
              if (m.filePath) {
                const normalizedFilePath = m.filePath.replace(/\\/g, '/').toLowerCase();
                if (normalizedFilePath === normalizedRel) return true;
              }
              
              if (m.modelUrl) {
                const normalizedModelUrl = m.modelUrl.replace(/\\/g, '/').toLowerCase();
                if (normalizedModelUrl.endsWith(normalizedRel)) return true;
              }
              
              return false;
            }) || null;
            await applyCategoryAndTagsTo(rel, candidate);
          }
        } catch (e) {
          // ignore
        }
      }

      setFiles([]);
      onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error('Upload error', err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFiles([]);
    setSingleDestination('uploads');
    setShowCreateFolderInput(false);
  setNewFolderName('');
  setSelectedCategory('Uncategorized');
  setApplyTags([]);

    (async () => {
      try {
        const resp = await fetch('/api/model-folders');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && Array.isArray(data.folders)) setFolders(Array.from(new Set(['uploads', ...data.folders])));
      } catch (e) {
        // ignore
      }
    })();

    try {
      const cfg = ConfigManager.loadConfig();
      const cats = Array.isArray(cfg?.categories) ? cfg.categories.map((c: any) => c?.label || c?.id).filter(Boolean) : [];
      setAvailableCategories(Array.from(new Set(['Uncategorized', ...cats])));
    } catch {
      // ignore
    }

    // rely on global TagsInput suggestions (context-driven); no local fetch needed
  }, [isOpen]);

  const createFolder = async (folderName?: string) => {
    const name = (folderName || newFolderName || '').trim();
    if (!name) {
      toast.error('Enter a folder name');
      return;
    }
    try {
      const resp = await fetch('/api/create-model-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: name }) });
      if (!resp.ok) throw new Error('Failed to create folder');
      const data = await resp.json();
      if (data && data.path) {
        setFolders(prev => Array.from(new Set([...(prev || []), data.path])));
        toast.success(`Created folder ${data.path}`);
        setNewFolderName('');
        setSingleDestination(data.path);
        setShowCreateFolderInput(false);
      }
    } catch (e: any) {
      console.error('Create folder error', e);
      toast.error(e?.message || 'Failed to create folder');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload 3MF / STL Files</DialogTitle>
          <DialogDescription>
            Choose destination, optional category and tags to apply to all uploaded models, and optionally generate previews.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-2">
          <div className="p-4">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="border-2 border-dashed border-border rounded p-6 text-center bg-card cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <p className="text-sm text-muted-foreground">Drag & drop .3mf or .stl files here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Files will be saved to the configured models/ directory and processed automatically.</p>
              <input ref={inputRef} type="file" multiple accept=".3mf,.stl" onChange={onFileChange} className="hidden" />
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox id="gen-previews" checked={generatePreviews} onCheckedChange={(v) => setGeneratePreviews(Boolean(v))} />
                <Label htmlFor="gen-previews" className="text-sm text-foreground">Generate preview images after upload</Label>
              </div>

              {/* Destination moved above Category */}
              <div className="mb-3">
                <div className="text-sm text-foreground mb-1">Destination</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Select value={singleDestination} onValueChange={(v) => setSingleDestination(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={singleDestination || 'uploads'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(folders || ['uploads']).map((folder) => (
                          <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1 cursor-pointer" onClick={() => setShowCreateFolderInput(!showCreateFolderInput)}>
                        <FolderPlus className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={4}>
                      Create folder
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {showCreateFolderInput && (
                <div className="mt-2 mb-2 flex items-center gap-2 w-full">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="new/folder/path"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => createFolder()}>Create</Button>
                </div>
              )}

              <div className="mb-3">
                <div className="text-sm text-foreground mb-1">Category</div>
                <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <div className="text-sm text-foreground mb-1">Tags to apply</div>
                <TagsInput
                  value={applyTags}
                  onChange={setApplyTags}
                  placeholder="Add tags…"
                />
                <p className="text-xs text-muted-foreground mt-1">Category defaults to "Uncategorized". Tags here will be applied to all uploaded models.</p>
              </div>

              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground">No files selected</div>
              ) : (
                <ScrollArea className="h-40">
                  <ul className="space-y-2">
                    {files.map((f, i) => (
                      <li key={i} className={`flex items-center justify-between p-2 rounded bg-muted/20`}>
                        <div className="text-sm w-3/4">
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{Math.round(f.size/1024)} KB</div>
                          <div className="mt-2 text-xs text-muted-foreground">Destination: {singleDestination || 'uploads'}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => removeFile(i)}>
                            <Trash className="h-4 w-4" />
                            Remove
                          </Button>
                          <div className="text-xs text-muted-foreground">{i + 1}/{files.length}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            {previewGenerating && (
              <div className="px-6 pb-4">
                <div className="text-sm text-foreground mb-1">Generating previews: {previewProgress.current}/{previewProgress.total}</div>
                <div className="w-full bg-muted h-2 rounded overflow-hidden">
                  <div style={{ width: `${Math.min(100, Math.round((previewProgress.current / Math.max(1, previewProgress.total)) * 100))}%` }} className="h-2 bg-accent" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={onClose} disabled={isUploading || previewGenerating}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isUploading || files.length === 0}>{isUploading ? 'Uploading...' : 'Upload & Process'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModelUploadDialog;
