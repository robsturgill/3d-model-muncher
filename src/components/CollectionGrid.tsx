import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Model } from '../types/model';
import type { Collection } from '../types/collection';
import { ModelCard } from './ModelCard';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ArrowLeft, ChevronRight, FileCheck, Folder } from 'lucide-react';
import type { AppConfig } from '../types/config';
import CollectionEditDrawer from './CollectionEditDrawer';
import { SelectionModeControls } from './SelectionModeControls';

interface CollectionGridProps {
  name: string;
  modelIds: string[];
  models: Model[];
  collections: Collection[]; // All collections (to find children)
  onOpenCollection: (col: Collection) => void; // To drill down
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

export default function CollectionGrid({
  name,
  modelIds,
  models,
  collections,        // <--- Add this
  onOpenCollection,   // <--- Add this
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
    return models.filter(m => set.has(m.id));
  }, [modelIds, models]);

  const modelIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    models.forEach((m, idx) => map.set(m.id, idx));
    return map;
  }, [models]);

  // Find direct children of the active collection
  const childCollections = useMemo(() => {
    if (!activeCollection) return [];
    return collections
      .filter(c => c.parentId === activeCollection.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections, activeCollection]);

  // Build breadcrumb path
  const breadcrumbs = useMemo(() => {
    if (!activeCollection) return [];
    const path: Collection[] = [activeCollection];
    let curr = activeCollection;
    
    // Walk up the tree
    while (curr.parentId) {
      const parent = collections.find(c => c.id === curr.parentId);
      if (parent) {
        path.unshift(parent);
        curr = parent;
      } else {
        break; 
      }
    }
    return path;
  }, [collections, activeCollection]);

  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);

  const handleModelInteraction = (e: MouseEvent, model: Model, fallbackIndex: number) => {
    const index = modelIndexMap.get(model.id) ?? fallbackIndex;
    if (isSelectionMode && onModelSelection) {
      onModelSelection(model.id, { shiftKey: e.shiftKey, index });
    } else {
      onModelClick(model);
    }
  };

  const selectedCount = selectedModelIds.length;

  const handleBulkDeleteClick = async () => {
    if (!onBulkDelete || selectedCount === 0) return;
    const res = onBulkDelete();
    if (res && typeof (res as any).then === 'function') {
      try {
        await res;
      } finally {
        onDeselectAll?.();
        if (isSelectionMode) {
          onToggleSelectionMode?.();
        }
      }
    }
  };

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
            <div className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <SelectionModeControls
          isSelectionMode={isSelectionMode}
          selectedCount={selectedCount}
          onEnterSelectionMode={onToggleSelectionMode}
          onExitSelectionMode={onToggleSelectionMode}
          onBulkEdit={onBulkEdit}
          onCreateCollection={selectedCount > 0 ? () => setIsCreateCollectionOpen(true) : undefined}
          onBulkDelete={onBulkDelete ? handleBulkDeleteClick : undefined}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
        />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 lg:p-6 pb-8 lg:pb-12 space-y-6">
          
          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span className="cursor-pointer hover:text-foreground" onClick={onBack}>Collections</span>
              {breadcrumbs.map((col, idx) => (
                <div key={col.id} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  <span 
                    className={idx === breadcrumbs.length - 1 ? "font-semibold text-foreground" : "cursor-pointer hover:text-foreground"}
                    onClick={() => idx !== breadcrumbs.length - 1 && onOpenCollection(col)}
                  >
                    {col.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Child Collections Grid */}
          {childCollections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Folder className="h-4 w-4" />
                Folders
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {childCollections.map(col => (
                  <div 
                    key={col.id} 
                    onClick={() => onOpenCollection(col)}
                    className="cursor-pointer"
                  >
                    {/* Reusing CollectionCard - ensure it handles click correctly or wrap it */}
                    <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center gap-3">
                        <Folder className="h-8 w-8 text-blue-500/80 fill-blue-500/20" />
                        <div className="min-w-0">
                            <div className="font-medium truncate">{col.name}</div>
                            <div className="text-xs text-muted-foreground">{col.modelIds?.length || 0} models</div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Models Grid */}
          {items.length === 0 && childCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h2 className="font-semibold text-lg">Collection is empty</h2>
              <p className="text-muted-foreground text-sm">Return and add items to this collection.</p>
            </div>
          ) : (
            items.length > 0 && (
              <div className="space-y-3">
                 {childCollections.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileCheck className="h-4 w-4" />
                      Models
                    </div>
                 )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {items.map((model, index) => {
                    const modelIndex = modelIndexMap.get(model.id) ?? index;
                    return (
                      <ModelCard
                        key={model.id}
                        model={model}
                        onClick={(e) => handleModelInteraction(e, model, modelIndex)}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedModelIds.includes(model.id)}
                        onSelectionChange={(id, shiftKey) => onModelSelection?.(id, { shiftKey, index: modelIndex })}
                        config={config || undefined}
                      />
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>
      <CollectionEditDrawer
        open={isCreateCollectionOpen}
        onOpenChange={setIsCreateCollectionOpen}
        collection={null}
        collections={collections}
        categories={config?.categories || []}
        removalCollection={activeCollection ?? null}
        initialModelIds={selectedModelIds}
        onSaved={() => {
          setIsCreateCollectionOpen(false);
          onCollectionChanged?.();
          onDeselectAll?.();
          if (isSelectionMode) {
            onToggleSelectionMode?.();
          }
        } }
      />
    </div>
  );
}
