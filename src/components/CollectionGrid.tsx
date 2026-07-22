import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { ArrowLeft, ChevronDown, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Model } from '../types/model';
import type { Collection, CollectionGroup } from '../types/collection';
import { ModelCard } from './ModelCard';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { AppConfig } from '../types/config';
import { SelectionModeControls } from './SelectionModeControls';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ImageWithFallback } from './ImageWithFallback';
import { resolveModelThumbnail } from '../utils/thumbnailUtils';
import CollectionGroupDrawer from './CollectionGroupDrawer';

interface CollectionGridProps {
  name: string;
  modelIds: string[];
  models: Model[];
  onBack: () => void;
  onModelClick: (model: Model) => void;
  config?: AppConfig | null;
  activeCollection?: Collection | null;
  isSelectionMode?: boolean;
  selectedModelIds?: string[];
  onModelSelection?: (modelId: string, opts?: { shiftKey?: boolean; index?: number }) => void;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkEdit?: () => void | Promise<void>;
  onBulkDelete?: () => void | Promise<void>;
  onCollectionChanged?: () => void;
}

interface VisibleGroup extends CollectionGroup {
  visibleModels: Model[];
}

const buildCollectionPayload = (collection: Collection, groups: CollectionGroup[]) => ({
  id: collection.id,
  name: collection.name,
  description: collection.description || '',
  modelIds: collection.modelIds || [],
  groups,
  category: collection.category || '',
  tags: collection.tags || [],
  images: collection.images || [],
  coverModelId: collection.coverModelId,
});

export default function CollectionGrid({
  name,
  modelIds,
  models,
  onBack,
  onModelClick,
  config,
  activeCollection,
  isSelectionMode = false,
  selectedModelIds = [],
  onModelSelection,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkEdit,
  onBulkDelete,
  onCollectionChanged,
}: CollectionGridProps) {
  const items = useMemo(() => {
    const set = new Set(modelIds);
    return models.filter((model) => set.has(model.id));
  }, [modelIds, models]);

  const modelIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    models.forEach((model, index) => map.set(model.id, index));
    return map;
  }, [models]);

  const visibleGroups = useMemo<VisibleGroup[]>(() => {
    const groups = Array.isArray(activeCollection?.groups) ? activeCollection.groups : [];
    const modelMap = new Map(items.map((model) => [model.id, model]));

    return groups
      .map((group) => ({
        ...group,
        visibleModels: (group.modelIds || [])
          .map((modelId) => modelMap.get(modelId))
          .filter(Boolean) as Model[],
      }))
      .filter((group) => group.visibleModels.length > 0);
  }, [activeCollection?.groups, items]);

  const groupedVisibleIds = useMemo(() => {
    const set = new Set<string>();
    visibleGroups.forEach((group) => {
      group.visibleModels.forEach((model) => set.add(model.id));
    });
    return set;
  }, [visibleGroups]);

  const ungroupedItems = useMemo(
    () => items.filter((model) => !groupedVisibleIds.has(model.id)),
    [groupedVisibleIds, items]
  );

  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CollectionGroup | null>(null);
  const [groupToRemove, setGroupToRemove] = useState<CollectionGroup | null>(null);
  const [isUngrouping, setIsUngrouping] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsGroupDrawerOpen(false);
    setEditingGroup(null);
    setGroupToRemove(null);
    setIsUngrouping(false);
    setExpandedGroupIds({});
  }, [activeCollection?.id]);

  const handleModelInteraction = (event: MouseEvent, model: Model, fallbackIndex: number) => {
    const index = modelIndexMap.get(model.id) ?? fallbackIndex;
    if (isSelectionMode && onModelSelection) {
      onModelSelection(model.id, { shiftKey: event.shiftKey, index });
    } else {
      onModelClick(model);
    }
  };

  const selectedCount = selectedModelIds.length;

  const handleBulkDeleteClick = async () => {
    if (!onBulkDelete || selectedCount === 0) return;
    const result = onBulkDelete();
    if (result && typeof (result as Promise<void>).then === 'function') {
      try {
        await result;
      } finally {
        onDeselectAll?.();
        if (isSelectionMode) {
          onToggleSelectionMode?.();
        }
      }
    }
  };

  const handleGroupSaved = () => {
    const wasEditing = !!editingGroup?.id;
    setIsGroupDrawerOpen(false);
    setEditingGroup(null);
    onCollectionChanged?.();
    if (!wasEditing) {
      onDeselectAll?.();
      if (isSelectionMode) {
        onToggleSelectionMode?.();
      }
    }
  };

  const handleUngroup = async () => {
    if (!activeCollection?.id || !groupToRemove?.id) return;
    setIsUngrouping(true);
    try {
      const nextGroups = (activeCollection.groups || []).filter((group) => group.id !== groupToRemove.id);
      const resp = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCollectionPayload(activeCollection, nextGroups)),
      });
      const res = await resp.json();
      if (!resp.ok || !res.success) throw new Error(res?.error || 'Failed to ungroup');
      setGroupToRemove(null);
      onCollectionChanged?.();
    } catch (error) {
      console.error('Failed to ungroup collection items:', error);
    } finally {
      setIsUngrouping(false);
    }
  };

  const totalGroupCount = Array.isArray(activeCollection?.groups) ? activeCollection.groups.length : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 lg:p-6 border-b bg-card shadow-sm shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2" title="Back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-col">
            <div className="font-semibold leading-tight">{name}</div>
            <div className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? '' : 's'}
              {totalGroupCount > 0 ? `, ${totalGroupCount} group${totalGroupCount === 1 ? '' : 's'}` : ''}
            </div>
          </div>
        </div>

        <SelectionModeControls
          isSelectionMode={isSelectionMode}
          selectedCount={selectedCount}
          onEnterSelectionMode={onToggleSelectionMode}
          onExitSelectionMode={onToggleSelectionMode}
          onBulkEdit={onBulkEdit}
          onCreateCollection={selectedCount > 0 ? () => {
            setEditingGroup(null);
            setIsGroupDrawerOpen(true);
          } : undefined}
          createActionLabel="Group"
          createActionTitle="Group selected models"
          onBulkDelete={onBulkDelete ? handleBulkDeleteClick : undefined}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
        />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 lg:p-6 pb-8 lg:pb-12 space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h2 className="font-semibold text-lg">Collection is empty</h2>
              <p className="text-muted-foreground text-sm">Return and add items to this collection.</p>
            </div>
          ) : (
            <>
              {visibleGroups.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-lg">Groups</h2>
                      <p className="text-sm text-muted-foreground">Expand a family to browse its individual variants.</p>
                    </div>
                    <Badge variant="secondary">{visibleGroups.length} visible</Badge>
                  </div>

                  {visibleGroups.map((group) => {
                    const isExpanded = !!expandedGroupIds[group.id];
                    const coverModel = group.visibleModels[0];
                    const visibleCount = group.visibleModels.length;
                    const totalCount = group.modelIds.length;

                    return (
                      <Collapsible key={group.id} open={isExpanded} onOpenChange={(open) => setExpandedGroupIds((prev) => ({ ...prev, [group.id]: open }))}>
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                          <div className="flex items-stretch gap-4 p-4">
                            <button
                              type="button"
                              className="flex flex-1 items-stretch gap-4 text-left"
                              onClick={() => setExpandedGroupIds((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                            >
                              <div className="w-24 shrink-0">
                                <ImageWithFallback
                                  src={coverModel ? resolveModelThumbnail(coverModel) : ''}
                                  alt={group.name}
                                  className="h-24 w-24 rounded-lg border object-cover"
                                  draggable={false}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                                      <Badge variant="outline">Group</Badge>
                                    </div>
                                    {group.description && (
                                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>{visibleCount === totalCount ? `${totalCount} variants` : `${visibleCount} of ${totalCount} variants`}</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>
                              </div>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="mt-1 h-8 w-8 shrink-0"
                                  onClick={(event) => event.stopPropagation()}
                                  title="Group actions"
                                  aria-label="Group actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                                <DropdownMenuItem onClick={() => { setEditingGroup(group); setIsGroupDrawerOpen(true); }}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit group
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setGroupToRemove(group)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Ungroup
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <CollapsibleContent>
                            <div className="border-t px-4 pb-4 pt-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {group.visibleModels.map((model, index) => {
                                  const modelIndex = modelIndexMap.get(model.id) ?? index;
                                  return (
                                    <ModelCard
                                      key={model.id}
                                      model={model}
                                      onClick={(event) => handleModelInteraction(event, model, modelIndex)}
                                      isSelectionMode={isSelectionMode}
                                      isSelected={selectedModelIds.includes(model.id)}
                                      onSelectionChange={(id, shiftKey) => onModelSelection?.(id, { shiftKey, index: modelIndex })}
                                      config={config || undefined}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </section>
              )}

              {ungroupedItems.length > 0 && (
                <section className="space-y-4">
                  {visibleGroups.length > 0 && (
                    <div>
                      <h2 className="font-semibold text-lg">Ungrouped</h2>
                      <p className="text-sm text-muted-foreground">Models not assigned to a family still appear individually.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {ungroupedItems.map((model, index) => {
                      const modelIndex = modelIndexMap.get(model.id) ?? index;
                      return (
                        <ModelCard
                          key={model.id}
                          model={model}
                          onClick={(event) => handleModelInteraction(event, model, modelIndex)}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedModelIds.includes(model.id)}
                          onSelectionChange={(id, shiftKey) => onModelSelection?.(id, { shiftKey, index: modelIndex })}
                          config={config || undefined}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      <CollectionGroupDrawer
        open={isGroupDrawerOpen}
        onOpenChange={(open) => {
          setIsGroupDrawerOpen(open);
          if (!open) setEditingGroup(null);
        }}
        collection={activeCollection ?? null}
        selectedModelIds={selectedModelIds}
        group={editingGroup}
        onSaved={handleGroupSaved}
      />

      <AlertDialog open={!!groupToRemove} onOpenChange={(open) => { if (!open) setGroupToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungroup these models?</AlertDialogTitle>
            <AlertDialogDescription>
              {groupToRemove
                ? `This removes "${groupToRemove.name}" as a group, but keeps all ${groupToRemove.modelIds.length} model${groupToRemove.modelIds.length === 1 ? '' : 's'} in the collection.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUngrouping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (event) => {
                event.preventDefault();
                await handleUngroup();
              }}
              disabled={isUngrouping}
            >
              {isUngrouping ? 'Ungrouping...' : 'Ungroup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
