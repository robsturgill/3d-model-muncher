import { useEffect, useRef, useState } from 'react';
import { Plus, List } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import TagsInput from './TagsInput';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import type { Collection } from '../types/collection';
import type { Category } from '../types/category';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  categories: Category[];
  onSaved?: (updated: Collection) => void;
  // When creating a new collection, supply model IDs to include
  initialModelIds?: string[];
  // Optional: when provided, allows removing selected models from this collection
  removalCollection?: Collection | null;
}

export default function CollectionEditDrawer({ open, onOpenChange, collection, categories, onSaved, initialModelIds = [], removalCollection = null }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // Default to 'Uncategorized' when not explicitly set
  const [category, setCategory] = useState<string>('Uncategorized');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  // Tags are now edited via shared TagsInput
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  // Existing collections (for adding selected models to an existing one)
  const [existingCollections, setExistingCollections] = useState<Collection[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  // Create flow mode toggle: 'new' (default) or 'existing'
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(collection?.name || '');
    setDescription(collection?.description || '');
    setCategory(collection?.category && collection.category.trim() ? collection.category : 'Uncategorized');
    setTags(Array.isArray(collection?.tags) ? collection!.tags! : []);
    setImages(Array.isArray(collection?.images) ? collection!.images! : []);
    // Reset existing selection in edit mode; in create mode, default to New and fetch existing collections
    if (collection?.id) {
      setSelectedExistingId('');
      setCreateMode('new');
    } else {
      // Reset mode and any prior selection when opening in create mode
      setCreateMode('new');
      setSelectedExistingId('');
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
  }, [open, collection?.id]);

  // Tag add/remove behavior handled in TagsInput

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

  const save = async () => {
    // Only save based on active view/mode
    if (!collection?.id) {
      if (createMode === 'new' && !name.trim()) return;
      if (createMode === 'existing' && !selectedExistingId) return;
    }
    setIsSaving(true);
    try {
      const isEdit = !!collection?.id;
      let payload: any;

      if (!isEdit && createMode === 'existing') {
        // Add the provided initialModelIds to an existing collection, preserving its other fields
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
        };
      } else {
        // Create new or update current collection (edit)
        payload = {
          name: name.trim(),
          description,
          category: (category && category.trim()) ? category : 'Uncategorized',
          tags,
          images,
        } as any;
        if (isEdit) {
          payload.id = collection!.id;
          payload.modelIds = collection!.modelIds;
          payload.coverModelId = collection!.coverModelId;
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
        onSaved?.(res.collection);
        onOpenChange(false);
    } catch (e) {
      console.error('Failed to save collection:', e);
    } finally {
      setIsSaving(false);
    }
  };

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
        // Prevent React synthetic events from bubbling through the portal to ancestors (e.g., CollectionCard onClick)
        // Use bubble-phase handlers so child onMouseDown (e.g., TagsInput suggestion items) still fire first.
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => {
          // Avoid losing data accidentally via Escape
          e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          // Prevent unwanted auto-focus shifts that might interact poorly with double clicks
          e.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>Collection</SheetTitle>
          <SheetDescription>
            {collection?.id
              ? 'Collections let you group related models into a named set for easy browsing and filtering. Update this collection’s name, description, category, tags, and images.'
              : 'Collections let you group related models into a named set for easy browsing and filtering. Create a new collection with your current selection, or add the selection to an existing one.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
          <div className="space-y-4 p-4">
            {removalTarget?.id && removableIds.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Remove from collection</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove {removableIds.length} item{removableIds.length === 1 ? '' : 's'} from "{removalTarget.name}".
                    This only affects the current collection and won’t delete the model files.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => { e.stopPropagation(); handleRemoveSelected(); }}
                  disabled={!canRemove}
                >
                  {isRemoving ? 'Removing…' : 'Remove selected from collection'}
                </Button>
              </div>
            )}
            {/* Create/Edit mode toggle (create flow only) */}
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

            {/* Existing collection picker (create mode + Existing tab) */}
            {!collection?.id && createMode === 'existing' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Add to existing collection</label>
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

            {/* New collection form (edit flow always uses this view) */}
            {(!!collection?.id || createMode === 'new') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                // Avoid bubbling clicks to underlying grid
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={!collection?.id && createMode === 'existing'}
              />
            </div>
            )}
            {(!!collection?.id || createMode === 'new') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                // Avoid bubbling clicks to underlying grid
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  // Ensure double-click selection does not bubble in a way that closes the sheet
                  e.stopPropagation();
                }}
                disabled={!collection?.id && createMode === 'existing'}
              />
            </div>
            )}
            {(!!collection?.id || createMode === 'new') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category || 'Uncategorized'}
                onValueChange={(val) => setCategory(val)}
              >
                <SelectTrigger disabled={!collection?.id && createMode === 'existing'}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Always include 'Uncategorized' as the default option */}
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
            )}
            {(!!collection?.id || createMode === 'new') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <TagsInput
                value={tags}
                onChange={(next) => setTags(next)}
                placeholder="Add tag"
                disabled={!collection?.id && createMode === 'existing'}
                // Note: Collection editor does not have global models here; suggestions can be wired later if available
              />
            </div>
            )}
            {(!!collection?.id || createMode === 'new') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Images</label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); onPickImages(); }} disabled={!collection?.id && createMode === 'existing'}>Add Images</Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative group border rounded overflow-hidden">
                      <img src={src} alt="" className="object-cover w-full h-24" />
                      <button
                        className="absolute top-1 right-1 bg-background/80 rounded px-1 text-xs opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); if (!(!collection?.id && createMode === 'existing')) setImages(images.filter((_, idx) => idx !== i)); }}
                        disabled={!collection?.id && createMode === 'existing'}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); save(); }}
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
