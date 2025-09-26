import { useCallback, useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { FolderPlus, Trash } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from 'sonner';

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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    const arr = Array.from(dt.files as FileList);
    const list = arr.filter((f: File) => /\.3mf$/i.test(f.name) || /\.stl$/i.test(f.name));
    if (list.length === 0) {
      toast.error('Please drop .3mf or .stl files only');
      return;
    }
    setFiles(prev => {
      const combined = ([...prev, ...list]);
      return combined;
    });
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files || []) as File[];
    const list = arr.filter((f: File) => /\.3mf$/i.test(f.name) || /\.stl$/i.test(f.name));
    if (list.length === 0) {
      toast.error('Please select .3mf or .stl files');
      return;
    }
    setFiles(prev => {
      const combined = ([...prev, ...list]);
      return combined;
    });
    // clear input so same file can be reselected
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }
    setIsUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);

    // include single destination for all files
    const destArray: string[] = files.map(() => singleDestination || 'uploads');
    fd.append('destinations', JSON.stringify(destArray));

    try {
      const resp = await fetch('/api/upload-models', { method: 'POST', body: fd });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Upload failed');
      }
      const data = await resp.json();
      toast.success(`Uploaded ${data.saved || files.length} files`);
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

  // Fetch available folders when opened
  useEffect(() => {
    if (!isOpen) return;
  // Reset dialog state when opened
  setFiles([]);
  setSingleDestination('uploads');
  setShowCreateFolderInput(false);
  setNewFolderName('');

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
  }, [isOpen]);

  const createFolder = async (folderName?: string) => {
    const name = (folderName || newFolderName || '').trim();
    if (!name) {
      toast.error('Enter a folder name');
      return;
    }
    try {
      const resp = await fetch('/api/create-model-folder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: name })
      });
      if (!resp.ok) throw new Error('Failed to create folder');
      const data = await resp.json();
      if (data && data.path) {
  // refresh folders
  setFolders(prev => Array.from(new Set([...(prev || []), data.path])));
  toast.success(`Created folder ${data.path}`);
  setNewFolderName('');
  // set the single destination to the newly created folder
  setSingleDestination(data.path);
  // hide the create folder input
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
        </DialogHeader>

        <div className="p-4">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-border rounded p-6 text-center bg-card cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <p className="text-sm text-muted-foreground">Drag & drop .3mf or .stl files here, or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Files will be saved to the configured models/uploads directory and processed automatically.</p>
            <input ref={inputRef} type="file" multiple accept=".3mf,.stl" onChange={onFileChange} className="hidden" />
          </div>

          <div className="mt-4">
            {/* Destination selector + create-folder icon */}
            <div className="mb-3">
              <div className="text-sm text-foreground mb-1">Destination</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select onValueChange={(v) => setSingleDestination(v)}>
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
                    <button className="p-1" onClick={() => setShowCreateFolderInput(!showCreateFolderInput)}>
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
              <div className="mt-2 flex items-center gap-2">
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="new/folder/path" className="input input-sm p-1 rounded border bg-background" />
                <Button variant="ghost" size="sm" onClick={() => createFolder()}>Create</Button>
              </div>
            )}

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
        </div>

        <DialogFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button variant="secondary" onClick={onClose} disabled={isUploading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isUploading || files.length === 0}>{isUploading ? 'Uploading...' : 'Upload & Process'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModelUploadDialog;
