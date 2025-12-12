import { useMemo, useState } from "react";
import { Model } from "../types/model";
import { AppConfig } from "../types/config";
import type { Collection } from "../types/collection";
import { ModelCard } from "./ModelCard";
import { CollectionCard } from "./CollectionCard";
import { CollectionListRow } from "./CollectionListRow";
import { ImageWithFallback } from "./ImageWithFallback";
import { resolveModelThumbnail } from '../utils/thumbnailUtils';
import { ConfigManager } from "../utils/configManager";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { LayoutGrid, List, Sliders, Clock, Weight, HardDrive } from "lucide-react";
import { Badge } from "./ui/badge";
import CollectionEditDrawer from "./CollectionEditDrawer";
import { SortKey, getModelTimestamp, getCollectionTimestamp } from "../utils/sortUtils";
import { SelectionModeControls } from "./SelectionModeControls";

interface ModelGridProps {
  models: Model[];
  collections?: Collection[];
  allCollections?: Collection[]; // <--- [NEW] Full list for parenting
  onModelClick: (model: Model) => void;
  onOpenCollection?: (collectionId: string) => void;
  onCollectionChanged?: () => void;
  isSelectionMode?: boolean;
  selectedModelIds?: string[];
  onModelSelection?: (modelId: string, opts?: { shiftKey?: boolean; index?: number }) => void;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkEdit?: () => void | Promise<void>;
  onBulkDelete?: () => void | Promise<void>;
  // Optional app-wide config passed from parent (App) so ModelGrid and ModelCard
  // can reflect live setting changes without reloading from storage.
  config?: AppConfig | null;
  // When provided and not 'none', collections will be interleaved with models per sort
  sortBy?: SortKey;
}

type ViewMode = 'grid' | 'list';

const UI_PREFS_KEY = '3d-model-muncher-ui-prefs';

function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return {} as any;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[ModelGrid] Failed to load UI prefs:', err);
    return {} as any;
  }
}

function saveUiPrefs(prefs: any) {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[ModelGrid] Failed to save UI prefs:', err);
  }
}

export function ModelGrid({ 
  models,
  collections = [],
  allCollections = [],
  onModelClick, 
  onOpenCollection,
  onCollectionChanged,
  isSelectionMode = false,
  selectedModelIds = [],
  onModelSelection,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkEdit,
  onBulkDelete,
  config: providedConfig,
  sortBy = 'none'
}: ModelGridProps) {
  // Prefer the provided app config (passed from App) so changes propagate immediately.
  // Fall back to loading from ConfigManager for standalone usage.
  const config = providedConfig ?? ConfigManager.loadConfig();
  const uiPrefs = loadUiPrefs();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (uiPrefs && (uiPrefs.defaultView === 'grid' || uiPrefs.defaultView === 'list')) {
      return uiPrefs.defaultView;
    }
    // Initialize from config, default to grid if invalid
    return ['grid', 'list'].includes(config.settings.defaultView) ? config.settings.defaultView : 'grid';
  });

  const [gridDensity, setGridDensity] = useState<number[]>(() => {
    if (uiPrefs && typeof uiPrefs.defaultGridDensity === 'number') return [uiPrefs.defaultGridDensity];
    // Initialize from config, ensure it's within valid range
    const density = config.settings.defaultGridDensity;
    return [density >= 1 && density <= 6 ? density : 4];
  });

  // Create Collection drawer state
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);

  // Save settings when they change
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    // Persist view mode in UI-only prefs (do not overwrite global app config)
    const prefs = loadUiPrefs();
    prefs.defaultView = newMode;
    saveUiPrefs(prefs);
  };

  const handleGridDensityChange = (newDensity: number[]) => {
    setGridDensity(newDensity);
    // Persist density in UI-only prefs (do not overwrite global app config)
    const prefs = loadUiPrefs();
    prefs.defaultGridDensity = newDensity[0];
    saveUiPrefs(prefs);
  };

  // Map density slider value to grid classes
  const getGridClasses = (density: number) => {
    const densityMap: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
      6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
    };
    return densityMap[density] || densityMap[4];
  };

  const handleModelInteraction = (e: React.MouseEvent, model: Model, index: number) => {
    if (isSelectionMode && onModelSelection) {
      onModelSelection(model.id, { shiftKey: e.shiftKey, index });
    } else {
      onModelClick(model);
    }
  };

  // Ensure bulk delete waits for any async work from parent, then clear selection
  const handleBulkDeleteClick = async () => {
    if (!onBulkDelete) return;
  const res = onBulkDelete();
    // If parent returns a Promise (meaning it performed async deletion), wait and then clear selection
    if (res && typeof (res as any).then === "function") {
      try {
        await res;
      } finally {
        onDeselectAll?.();
        onToggleSelectionMode?.();
      }
    }
    // If parent did not return a Promise (e.g. it just opened a confirmation dialog), don't clear selection here.
  };

  const handleCheckboxClick = (e: React.MouseEvent<HTMLButtonElement>, modelId: string, index: number) => {
    e.stopPropagation();
    if (onModelSelection) {
      onModelSelection(modelId, { index, shiftKey: e.shiftKey });
    }
  };

  // Build a map from model id to its index in the provided models array to preserve selection behavior
  const modelIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    models.forEach((m, i) => map.set(m.id, i));
    return map;
  }, [models]);

  // When sorting is active, create a unified, interleaved list of items (collections + models)
  const unifiedItems: ({ kind: 'collection'; data: Collection } | { kind: 'model'; data: Model })[] | null = useMemo(() => {
    if (!sortBy || sortBy === 'none') return null;
    type Item = { kind: 'collection'; data: Collection } | { kind: 'model'; data: Model };
    const items: Item[] = [
      ...collections.filter(Boolean).map(c => ({ kind: 'collection', data: c } as Item)),
      ...models.map(m => ({ kind: 'model', data: m } as Item)),
    ];
    const getName = (it: Item) => (it.kind === 'collection' ? it.data.name : it.data.name) || '';
    const getTime = (it: Item) => it.kind === 'collection' ? getCollectionTimestamp(it.data) : getModelTimestamp(it.data);
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return getName(a).localeCompare(getName(b));
        case 'name_desc':
          return getName(b).localeCompare(getName(a));
        case 'modified_asc': {
          const ta = getTime(a), tb = getTime(b);
          if (ta !== tb) return ta - tb;
          return getName(a).localeCompare(getName(b));
        }
        case 'modified_desc': {
          const ta = getTime(a), tb = getTime(b);
          if (ta !== tb) return tb - ta;
          return getName(a).localeCompare(getName(b));
        }
        default:
          return 0;
      }
    });
    return items;
  }, [collections, models, sortBy]);

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced header with view controls */}
      <div className="p-4 lg:p-6 border-b bg-card shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-muted-foreground text-sm font-medium">
              {models.length > 0
                ? `${models.length} model${models.length !== 1 ? 's' : ''} found`
                : collections.length > 0
                ? `${collections.length} collection${collections.length !== 1 ? 's' : ''}`
                : 'No items found'}
            </p>
            
            {/* View Mode Toggle - Hide in selection mode for cleaner UI */}
            {!isSelectionMode && (
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                  className="h-8 px-3 transition-all"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                  className="h-8 px-3 transition-all"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SelectionModeControls
              isSelectionMode={isSelectionMode}
              selectedCount={selectedModelIds.length}
              onEnterSelectionMode={onToggleSelectionMode}
              onExitSelectionMode={onToggleSelectionMode}
              onBulkEdit={onBulkEdit}
              onCreateCollection={() => setIsCreateCollectionOpen(true)}
              onBulkDelete={onBulkDelete ? handleBulkDeleteClick : undefined}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
            />
            {/* Grid Density Control - Only show in grid mode and not in selection mode */}
            {viewMode === 'grid' && !isSelectionMode && (
              <div className="flex items-center gap-3 min-w-0 hidden md:flex">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sliders className="h-4 w-4" />
                  <span className="hidden sm:inline">Density</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-3">1</span>
                  <Slider
                    value={gridDensity}
                    onValueChange={handleGridDensityChange}
                    min={1}
                    max={6}
                    step={1}
                    className="w-20 sm:w-28"
                  />
                  <span className="text-xs text-muted-foreground w-3">6</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 lg:p-6 pb-8 lg:pb-12">
          {(models.length === 0 && collections.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h2 className="font-semibold text-lg">No items found</h2>
              <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
              <img
                src="/images/munchie-front.png"
                alt="No items found"
                width="418"
              />
            </div>
          ) : viewMode === 'grid' ? (
            <div className={`grid ${getGridClasses(gridDensity[0])} gap-4 lg:gap-6`}>
              {unifiedItems ? (
                unifiedItems.map((it, idx) => {
                  if (it.kind === 'collection') {
                    const c = it.data;
                    return (
                      <CollectionCard
                        key={`col-${c.id}`}
                        collection={c}
                        categories={config.categories || []}
                        onOpen={(id) => onOpenCollection?.(id)}
                        onChanged={() => onCollectionChanged?.()}
                        onDeleted={() => onCollectionChanged?.()}
                      />
                    );
                  }
                  const model = it.data;
                  const index = modelIndexMap.get(model.id) ?? idx;
                  return (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onClick={(e) => handleModelInteraction(e, model, index)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedModelIds.includes(model.id)}
                      onSelectionChange={(id, shiftKey) => onModelSelection?.(id, { index, shiftKey })}
                      config={config}
                    />
                  );
                })
              ) : (
                <>
                  {collections.filter(Boolean).map((c) => (
                    <CollectionCard
                      key={`col-${c.id}`}
                      collection={c}
                      categories={config.categories || []}
                      onOpen={(id) => onOpenCollection?.(id)}
                      onChanged={() => onCollectionChanged?.()}
                      onDeleted={() => onCollectionChanged?.()}
                    />
                  ))}
                  {models.map((model, index) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onClick={(e) => handleModelInteraction(e, model, index)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedModelIds.includes(model.id)}
                      onSelectionChange={(id, shiftKey) => onModelSelection?.(id, { index, shiftKey })}
                      config={config}
                    />
                  ))}
                </>
              )}
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {unifiedItems ? (
                unifiedItems.map((it, idx) => {
                  if (it.kind === 'collection') {
                    const c = it.data;
                    return (
                      <CollectionListRow
                        key={`col-row-${c.id}`}
                        collection={c}
                        categories={config.categories || []}
                        onOpen={(id) => onOpenCollection?.(id)}
                        onChanged={() => onCollectionChanged?.()}
                        onDeleted={() => onCollectionChanged?.()}
                      />
                    );
                  }
                  const model = it.data;
                  const index = modelIndexMap.get(model.id) ?? idx;
                  return (
                    <div
                      key={model.id}
                      data-testid={`row-${model.id}`}
                      onClick={(e) => handleModelInteraction(e, model, index)}
                  onMouseDown={(e) => {
                    // Prevent text selection when Shift-clicking in selection mode
                    if (isSelectionMode && e.shiftKey) e.preventDefault();
                  }}
                  className={`flex items-center gap-4 p-4 bg-card rounded-lg border hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md ${
                    isSelectionMode && selectedModelIds.includes(model.id) 
                      ? 'border-primary bg-primary/5' 
                      : ''
                  }`}
                >
                  {/* Selection Checkbox - Only show in selection mode */}
                  {isSelectionMode && (
                    <div className="flex-shrink-0 pl-1">
                      <Checkbox
                        checked={selectedModelIds.includes(model.id)}
                        // handle clicks to capture shiftKey; avoid double firing on change
                        onCheckedChange={() => { /* handled by click */ }}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleCheckboxClick(e, model.id, index)}
                        data-testid={`checkbox-${model.id}`}
                        className="w-5 h-5"
                      />
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                      <div className="relative">
                      <ImageWithFallback
                        src={resolveModelThumbnail(model)}
                        alt={model.name}
                        className={`w-20 h-20 object-cover rounded-lg border group-hover:border-primary/30 transition-colors ${
                          isSelectionMode && selectedModelIds.includes(model.id) 
                            ? 'border-primary' 
                            : ''
                        }`}
                      />
                      {/* Print status overlay (hideable via config.showPrintedBadge) */}
                      {(() => {
                        const effectiveCfg = providedConfig ?? ConfigManager.loadConfig();
                        const showBadge = effectiveCfg?.settings?.showPrintedBadge !== false;

                        // If model is NOT printed, always show the not-printed dot
                        if (!model.isPrinted) {
                          return <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-yellow-500`} />;
                        }

                        // If model is printed, only show the printed (green) dot when allowed
                        if (model.isPrinted && showBadge) {
                          return <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-green-700`} />;
                        }

                        return null;
                      })()}
                    </div>
                  </div>
                  
                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-semibold group-hover:text-primary transition-colors truncate text-lg ${
                          isSelectionMode && selectedModelIds.includes(model.id) 
                            ? 'text-primary' 
                            : 'text-card-foreground'
                        }`}>
                          {model.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>
                        
                        {/* Category */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs font-medium">
                            {model.category}
                          </Badge>
                          {model.hidden && (
                            <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(model.tags || []).slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(model.tags || []).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{(model.tags || []).length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Status and Stats */}
                      <div className="flex flex-col items-end gap-3 ml-6">
                        {(() => {
                          const effectiveCfg = providedConfig ?? ConfigManager.loadConfig();
                          const showBadge = effectiveCfg?.settings?.showPrintedBadge !== false;
                          if (!showBadge) return null;

                          return (
                            <Badge 
                              variant={model.isPrinted ? "default" : "secondary"}
                              className="font-medium"
                            >
                              {model.isPrinted ? "✓ Printed" : "○ Not Printed"}
                            </Badge>
                          );
                        })()}
                        
                        <div className="text-xs text-muted-foreground text-right space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{model.printTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            <span>{model.filamentUsed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{model.fileSize}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })
              ) : (
                <>
                  {collections.filter(Boolean).map((c) => (
                    <CollectionListRow
                      key={`col-row-${c.id}`}
                      collection={c}
                      categories={config.categories || []}
                      onOpen={(id) => onOpenCollection?.(id)}
                      onChanged={() => onCollectionChanged?.()}
                      onDeleted={() => onCollectionChanged?.()}
                    />
                  ))}
                  {models.map((model, index) => (
                      <div
                        key={model.id}
                        data-testid={`row-${model.id}`}
                        onClick={(e) => handleModelInteraction(e, model, index)}
                      onMouseDown={(e) => {
                        // Prevent text selection when Shift-clicking in selection mode
                        if (isSelectionMode && e.shiftKey) e.preventDefault();
                      }}
                      className={`flex items-center gap-4 p-4 bg-card rounded-lg border hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md ${
                        isSelectionMode && selectedModelIds.includes(model.id) 
                          ? 'border-primary bg-primary/5' 
                          : ''
                      }`}
                    >
                      {/* Selection Checkbox - Only show in selection mode */}
                      {isSelectionMode && (
                        <div className="flex-shrink-0 pl-1">
                          <Checkbox
                            checked={selectedModelIds.includes(model.id)}
                            // handle clicks to capture shiftKey; avoid double firing on change
                            onCheckedChange={() => { /* handled by click */ }}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleCheckboxClick(e, model.id, index)}
                            data-testid={`checkbox-${model.id}`}
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                      
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                          <div className="relative">
                          <ImageWithFallback
                            src={resolveModelThumbnail(model)}
                            alt={model.name}
                            className={`w-20 h-20 object-cover rounded-lg border group-hover:border-primary/30 transition-colors ${
                              isSelectionMode && selectedModelIds.includes(model.id) 
                                ? 'border-primary' 
                                : ''
                            }`}
                          />
                          {/* Print status overlay (hideable via config.showPrintedBadge) */}
                          {(() => {
                            const effectiveCfg = providedConfig ?? ConfigManager.loadConfig();
                            const showBadge = effectiveCfg?.settings?.showPrintedBadge !== false;

                            // If model is NOT printed, always show the not-printed dot
                            if (!model.isPrinted) {
                              return <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-yellow-500`} />;
                            }

                            // If model is printed, only show the printed (green) dot when allowed
                            if (model.isPrinted && showBadge) {
                              return <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-green-700`} />;
                            }

                            return null;
                          })()}
                        </div>
                      </div>
                      
                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold group-hover:text-primary transition-colors truncate text-lg ${
                              isSelectionMode && selectedModelIds.includes(model.id) 
                                ? 'text-primary' 
                                : 'text-card-foreground'
                            }`}>
                              {model.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {model.description}
                            </p>
                            
                            {/* Category */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs font-medium">
                                {model.category}
                              </Badge>
                              {model.hidden && (
                                <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(model.tags || []).slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {(model.tags || []).length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(model.tags || []).length - 4}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Status and Stats */}
                          <div className="flex flex-col items-end gap-3 ml-6">
                            {(() => {
                              const effectiveCfg = providedConfig ?? ConfigManager.loadConfig();
                              const showBadge = effectiveCfg?.settings?.showPrintedBadge !== false;
                              if (!showBadge) return null;

                              return (
                                <Badge 
                                  variant={model.isPrinted ? "default" : "secondary"}
                                  className="font-medium"
                                >
                                  {model.isPrinted ? "✓ Printed" : "○ Not Printed"}
                                </Badge>
                              );
                            })()}
                            
                            <div className="text-xs text-muted-foreground text-right space-y-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{model.printTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Weight className="h-3 w-3" />
                                <span>{model.filamentUsed}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                <span>{model.fileSize}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      {/* Create Collection Drawer (uses CollectionEditDrawer) */}
      <CollectionEditDrawer
        open={isCreateCollectionOpen}
        onOpenChange={(open) => {
          if (!open) setIsCreateCollectionOpen(false);
          else setIsCreateCollectionOpen(true);
        }}
        collection={null}
        collections={allCollections} // <--- [NEW] Pass the full list
        categories={config.categories || []}
        initialModelIds={selectedModelIds}
        onSaved={() => {
          setIsCreateCollectionOpen(false);
          // Leave selection mode to reduce confusion after collection creation
          onToggleSelectionMode?.();
          // Notify parent to refresh collections if provided
          onCollectionChanged?.();
        }}
      />
    </div>
  );
}