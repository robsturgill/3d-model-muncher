import { useEffect, useMemo, useState } from 'react';
import { List, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Collection, CollectionGroup } from '../types/collection';

interface CollectionGroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  selectedModelIds?: string[];
  group?: CollectionGroup | null;
  onSaved?: (updated: Collection) => void;
}

const uniqueStringArray = (values: string[] = []) => Array.from(new Set(values.filter(Boolean)));

const buildCollectionPayload = (collection: Collection, groups: CollectionGroup[], modelIds: string[] = collection.modelIds || []) => ({
  id: collection.id,
  name: collection.name,
  description: collection.description || '',
  modelIds,
  groups,
  category: collection.category || '',
  tags: collection.tags || [],
  images: collection.images || [],
  coverModelId: collection.coverModelId,
});

export default function CollectionGroupDrawer({
  open,
  onOpenChange,
  collection,
  selectedModelIds = [],
  group = null,
  onSaved,
}: CollectionGroupDrawerProps) {
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const availableGroups = useMemo(
    () => (Array.isArray(collection?.groups) ? collection.groups : []),
    [collection?.groups]
  );

  const normalizedSelectedIds = useMemo(
    () => uniqueStringArray(selectedModelIds),
    [selectedModelIds]
  );

  useEffect(() => {
    if (!open) return;
    if (group?.id) {
      setCreateMode('new');
      setSelectedExistingId('');
      setName(group.name || '');
      setDescription(group.description || '');
      return;
    }

    setCreateMode('new');
    setSelectedExistingId('');
    setName('');
    setDescription('');
  }, [open, group?.id, group?.name, group?.description]);

  const save = async () => {
    if (!collection?.id) return;
    if (!group?.id) {
      if (createMode === 'new' && !name.trim()) return;
      if (createMode === 'existing' && !selectedExistingId) return;
    }

    setIsSaving(true);
    try {
      const currentGroups = Array.isArray(collection.groups) ? collection.groups : [];
      let nextGroups: CollectionGroup[] = currentGroups;

      if (group?.id) {
        nextGroups = currentGroups.map((entry) => (
          entry.id === group.id
            ? { ...entry, name: name.trim(), description }
            : entry
        ));
      } else {
        const selectedIdSet = new Set(normalizedSelectedIds);
        const strippedGroups = currentGroups
          .map((entry) => ({
            ...entry,
            modelIds: (entry.modelIds || []).filter((modelId) => !selectedIdSet.has(modelId)),
          }))
          .filter((entry) => entry.modelIds.length > 0);

        if (createMode === 'existing') {
          nextGroups = strippedGroups.map((entry) => (
            entry.id === selectedExistingId
              ? {
                  ...entry,
                  modelIds: uniqueStringArray([...(entry.modelIds || []), ...normalizedSelectedIds]),
                }
              : entry
          ));
        } else {
          nextGroups = [
            ...strippedGroups,
            {
              id: '',
              name: name.trim(),
              description,
              modelIds: normalizedSelectedIds,
            },
          ];
        }
      }

      const resp = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCollectionPayload(collection, nextGroups)),
      });
      const res = await resp.json();
      if (!resp.ok || !res.success) throw new Error(res?.error || 'Failed to save group');
      onSaved?.(res.collection);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save collection group:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = normalizedSelectedIds.length;
  const isEditing = !!group?.id;
  const removableIds = normalizedSelectedIds.filter((modelId) => (collection?.modelIds || []).includes(modelId));

  const handleRemoveSelected = async () => {
    if (!collection?.id || removableIds.length === 0) return;
    setIsRemoving(true);
    try {
      const removableIdSet = new Set(removableIds);
      const nextGroups = (collection.groups || [])
        .map((entry) => ({
          ...entry,
          modelIds: (entry.modelIds || []).filter((modelId) => !removableIdSet.has(modelId)),
        }))
        .filter((entry) => entry.modelIds.length > 0);
      const remainingIds = (collection.modelIds || []).filter((modelId) => !removableIdSet.has(modelId));

      const resp = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCollectionPayload(collection, nextGroups, remainingIds)),
      });
      const res = await resp.json();
      if (!resp.ok || !res.success) throw new Error(res?.error || 'Failed to remove items');
      onSaved?.(res.collection);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to remove models from collection:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg"
        blockOverlayInteractions={false}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit group' : 'Group models'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Rename this grouped family or adjust its description.'
              : `Bundle ${selectedCount} selected item${selectedCount === 1 ? '' : 's'} under one expandable group inside this collection.`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
          <div className="space-y-4 p-4">
            {!isEditing && removableIds.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Remove from collection</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove {removableIds.length} item{removableIds.length === 1 ? '' : 's'} from "{collection?.name || 'this collection'}".
                    This only affects the current collection and will not delete any model files.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleRemoveSelected}
                  disabled={isRemoving}
                >
                  {isRemoving ? 'Removing...' : 'Remove selected from collection'}
                </Button>
              </div>
            )}

            {!isEditing && (
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

            {!isEditing && createMode === 'existing' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Existing group</label>
                <Select value={selectedExistingId} onValueChange={setSelectedExistingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name} ({entry.modelIds.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">No groups yet. Create a new one first.</p>
                )}
              </div>
            )}

            {(isEditing || createMode === 'new') && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group name</label>
                  <Input
                    placeholder="Dragon model"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Optional note about the grouped variants"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              {isEditing
                ? `${group?.modelIds.length || 0} model${group?.modelIds.length === 1 ? '' : 's'} currently belong to this group.`
                : `${selectedCount} selected model${selectedCount === 1 ? '' : 's'} will stay in the collection and become one expandable group.`}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={save}
                disabled={
                  isSaving
                  || isRemoving
                  || !collection?.id
                  || (!isEditing && selectedCount === 0)
                  || (!isEditing && createMode === 'existing' && !selectedExistingId)
                  || ((isEditing || createMode === 'new') && !name.trim())
                }
              >
                {isSaving ? 'Saving...' : 'Save group'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
