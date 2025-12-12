import { useEffect, useRef, useState } from 'react';
import { Plus, List } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Label } from "./ui/label"; // Ensure Label is imported
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import TagsInput from './TagsInput';
// [NEW] Imports for the Parent Dropdown
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { toast } from "sonner";
import type { Collection } from '../types/collection';
import type { Category } from '../types/category';

// [RENAMED] Changed 'Props' to 'CollectionEditDrawerProps' for clarity
interface CollectionEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  
  // [NEW] List of all collections for parent selection
  collections: Collection[];
  
  categories: Category[];
  onSaved?: (updated: Collection) => void;
  initialModelIds?: string[];
  removalCollection?: Collection | null;
}

export default function CollectionEditDrawer({ 
  open, 
  onOpenChange, 
  collection, 
  collections, // [NEW] Extract this prop
  categories, 
  onSaved, 
  initialModelIds = [], 
  removalCollection = null 
}: CollectionEditDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Uncategorized');
  // [NEW] State for Parent ID (default 'root')
  const [parentId, setParentId] = useState<string>("root");
  
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [existingCollections, setExistingCollections] = useState<Collection[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter out the current collection from the parent list to avoid cycles
  // (A collection cannot be its own parent)
  const availableParents = collections.filter(c => 
    (!collection || c.id !== collection.id)
  );

  useEffect(() => {
    if (!open) return;
    
    if (collection) {
      // Edit Mode
      setName(collection.name || '');
      setDescription(collection.description || '');
      setCategory(collection.category && collection.category.trim() ? collection.category : 'Uncategorized');
      setParentId(collection.parentId || "root"); // [NEW] Load existing parent
      setTags(Array.isArray(collection.tags) ? collection.tags : []);
      setImages(Array.isArray(collection.images) ? collection.images : []);
      
      setSelectedExistingId('');
      setCreateMode('new');
    } else {
      // Create Mode
      setName('');
      setDescription('');
      setCategory('Uncategorized');
      // [NEW] Default to 'root' unless explicitly nested in future logic
      setParentId(removalCollection ? (removalCollection.id || "root") : "root");
      setTags([]);
      setImages([]);
      
      setCreateMode('new');
      setSelectedExistingId('');
      
      // Load existing collections for the "Add to Existing" tab
      (async () => {
        try {
          const resp = await fetch('/api/collections', { cache: 'no-store' });
          const data = await resp.json();
          if (resp.ok && data && data.success && Array.isArray(data.collections)) {
            setExistingCollections(data.collections);
          } else {
            setExistingCollections([]);
          }
        } catch {
          setExistingCollections([]);
        }
      })();
    }
  }, [open, collection?.id, removalCollection]);

  const onPickImages = () => fileInputRef.current?.click();

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    if (files.length === 0) return;
    const reads: Promise<string>[] = files.map(f => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = reject;
      r.readAsDataURL(f);
    }));
    const data = await Promise.all(reads);
    setImages(prev => [...prev, ...data]);
    try { e.currentTarget.value = ''; } catch {}
  };

  const handleSave = async () => {
    if (!collection?.id) {
      if (createMode === 'new' && !name.trim()) return;
      if (createMode === 'existing' && !selectedExistingId) return;
    }
    
    setIsSaving(true);
    try {
      const isEdit = !!collection?.id;
      let payload: any;

      if (!isEdit && createMode === 'existing') {
        // Add models to EXISTING collection
        const existing = existingCollections.find(c => c.id === selectedExistingId);
        if (!existing) throw new Error('Selected collection not found');
        
        const nextIds = Array.from(new Set([...(existing.modelIds || []), ...((Array.isArray(initialModelIds) ? initialModelIds : []) as string[])]));
        
        payload = {
          id: existing.id,
          name: existing.name,
          description: existing.description || '',
          modelIds: nextIds,
          category: (existing as any).category || '',
          tags: (existing as any).tags || [],
          images: (existing as any).images || [],
          coverModelId: (existing as any).coverModelId,
          // Preserve existing parent/children structure
          parentId: existing.parentId,
          childCollectionIds: existing.childCollectionIds
        };
      } else {
        // Create NEW or UPDATE existing
        payload = {
          name: name.trim(),
          description,
          category: (category && category.trim()) ? category : 'Uncategorized',
          // [NEW] Send parentId (convert "root" string to null)
          parentId: parentId === "root" ? null : parentId,
          tags,
          images,
        };

        if (isEdit) {
          payload.id = collection!.id;
          payload.modelIds = collection!.modelIds;
          payload.coverModelId = collection!.coverModelId;
          // Preserve children if editing parent
          payload.childCollectionIds = collection!.childCollectionIds;
        } else {
          payload.modelIds = Array.isArray(initialModelIds) ? initialModelIds : [];
        }
      }

      const resp = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const res = await resp.json();
      if (!resp.ok || !res.success) throw new Error(res?.error || 'Failed to save');
      
      // Dispatch event so App knows to refresh immediately
      window.dispatchEvent(new CustomEvent('collection-created', { detail: res.collection }));
      
      toast.success(isEdit ? "Collection updated" : "Collection created");
      onSaved?.(res.collection);
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to save collection:', e);
      toast.error("Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  };

  // Logic for removing items from a collection
  const removalTarget = removalCollection ?? collection;
  const removableIds = Array.isArray(initialModelIds) ? initialModelIds.filter(id => (removalTarget?.modelIds || []).includes(id)) : [];
  const canRemove = !!removalTarget?.id && removableIds.length > 0 && !isRemoving;

  const handleRemoveSelected = async () => {
    if (!removalTarget?.id || removableIds.length === 0) return;
    setIsRemoving(true);
    try {
      const remainingIds = (removalTarget.modelIds || []).filter(id => !removableIds.includes(id));
      const payload = {
        id: removalTarget.id,
        name: removalTarget.name,
        description: removalTarget.description || '',
        modelIds: remainingIds,
        category: (removalTarget as any).category || '',
        tags: (removalTarget as any).tags || [],
        images: (removalTarget as any).images || [],
        coverModelId: (removalTarget as any).coverModelId,
        parentId: removalTarget.parentId,
        childCollectionIds: removalTarget.childCollectionIds
      };

      const resp = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await resp.json();
      if (!resp.ok || !res.success) throw new Error(res?.error || 'Failed to remove items');
      onSaved?.(res.collection);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to remove models from collection:', err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl"
        blockOverlayInteractions={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{collection?.id ? 'Edit Collection' : 'New Collection'}</SheetTitle>
          <SheetDescription>
            {collection?.id
              ? 'Update this collection’s name, parent, description, category, tags, and images.'
              : 'Create a new collection or add selected models to an existing one.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
          <div className="space-y-4 p-4">
            
            {/* Removal Warning Block */}
            {removalTarget?.id && removableIds.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Remove from collection</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove {removableIds.length} item{removableIds.length === 1 ? '' : 's'} from "{removalTarget.name}".
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => { e.stopPropagation(); handleRemoveSelected(); }}
                  disabled={!canRemove}
                >
                  {isRemoving ? 'Removing…' : 'Remove selected'}
                </Button>
              </div>
            )}

            {/* Create Mode Toggle (New vs Existing) */}
            {!collection?.id && (
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg text-card-foreground">Choose</div>
                <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
                  <Button
                    variant={createMode === 'new' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCreateMode('new')}
                    className="gap-2 h-8 px-3"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                  <Button
                    variant={createMode === 'existing' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCreateMode('existing')}
                    className="gap-2 h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                    Existing
                  </Button>
                </div>
              </div>
            )}

            {/* EXISTING Collection Picker */}
            {!collection?.id && createMode === 'existing' && (
              <div className="space-y-2">
                <Label>Add to existing collection</Label>
                <Select
                  value={selectedExistingId}
                  onValueChange={(val) => setSelectedExistingId(val)}
                >
                  <SelectTrigger onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Choose an existing collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {(existingCollections || [])
                      .slice()
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {existingCollections.length === 0 && (
                  <p className="text-xs text-muted-foreground">No existing collections yet.</p>
                )}
              </div>
            )}

            {/* NEW / EDIT Collection Form */}
            {(!!collection?.id || createMode === 'new') && (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Collection name"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* [NEW] Parent Collection Selector */}
                <div className="space-y-2">
                  <Label>Parent Collection</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">
                        <span className="text-muted-foreground italic">No Parent (Root Level)</span>
                      </SelectItem>
                      {availableParents.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category || 'Uncategorized'}
                    onValueChange={(val) => setCategory(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                      {categories
                        .filter(c => c?.label && c.label.trim() !== '')
                        .filter(c => c.label !== 'Uncategorized')
                        .map(c => (
                          <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagsInput
                    value={tags}
                    onChange={(next) => setTags(next)}
                    placeholder="Add tag"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Images</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); onPickImages(); }}>Add Images</Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {images.map((src, i) => (
                        <div key={i} className="relative group border rounded overflow-hidden">
                          <img src={src} alt="" className="object-cover w-full h-24" />
                          <button
                            className="absolute top-1 right-1 bg-background/80 rounded px-1 text-xs opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setImages(images.filter((_, idx) => idx !== i)); }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={
                  isSaving || (
                    collection?.id
                      ? false
                      : (createMode === 'new' ? !name.trim() : !selectedExistingId)
                  )
                }
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}