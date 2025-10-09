import { useEffect, useRef, useState } from 'react';
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
}

export default function CollectionEditDrawer({ open, onOpenChange, collection, categories, onSaved, initialModelIds = [] }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // Default to 'Uncategorized' when not explicitly set
  const [category, setCategory] = useState<string>('Uncategorized');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  // Tags are now edited via shared TagsInput
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(collection?.name || '');
    setDescription(collection?.description || '');
    setCategory(collection?.category && collection.category.trim() ? collection.category : 'Uncategorized');
    setTags(Array.isArray(collection?.tags) ? collection!.tags! : []);
    setImages(Array.isArray(collection?.images) ? collection!.images! : []);
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
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const isEdit = !!collection?.id;
      const payload: any = {
        name: name.trim(),
        description,
        category: (category && category.trim()) ? category : 'Uncategorized',
        tags,
        images,
      };
      if (isEdit) {
        payload.id = collection!.id;
        payload.modelIds = collection!.modelIds;
        payload.coverModelId = collection!.coverModelId;
      } else {
        payload.modelIds = Array.isArray(initialModelIds) ? initialModelIds : [];
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl"
        // Prevent React synthetic events from bubbling through the portal to ancestors (e.g., CollectionCard onClick)
        // Use bubble-phase handlers so child onMouseDown (e.g., TagsInput suggestion items) still fire first.
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          // Prevent accidental close when double-clicking or selecting text
          e.preventDefault();
          // Also stop the original event so it doesn't reach underlying cards/grids
          // @ts-ignore - radix provides originalEvent on detail
          if ((e as any)?.detail?.originalEvent?.stopPropagation) {
            // @ts-ignore
            (e as any).detail.originalEvent.stopPropagation();
          }
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          // @ts-ignore
          if ((e as any)?.detail?.originalEvent?.stopPropagation) {
            // @ts-ignore
            (e as any).detail.originalEvent.stopPropagation();
          }
        }}
        onFocusOutside={(e) => {
          e.preventDefault();
        }}
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
          <SheetTitle>{collection?.id ? 'Edit Collection' : 'New Collection'}</SheetTitle>
          <SheetDescription>Update the collection’s details like name, description, category, tags, and images.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                // Avoid bubbling clicks to underlying grid
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            </div>
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
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category || 'Uncategorized'}
                onValueChange={(val) => setCategory(val)}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <TagsInput
                value={tags}
                onChange={(next) => setTags(next)}
                placeholder="Add tag"
                // Note: Collection editor does not have global models here; suggestions can be wired later if available
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Images</label>
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
                disabled={isSaving || !name.trim()}
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
