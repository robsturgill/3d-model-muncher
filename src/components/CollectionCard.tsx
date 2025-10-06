import { useState } from "react";
import { Folder, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import CollectionEditDrawer from "./CollectionEditDrawer";
import type { Collection } from "../types/collection";
import type { Category } from "../types/category";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { ConfigManager } from "../utils/configManager";
import { getLabel } from "../constants/labels";

export interface CollectionCardProps {
  collection: Collection;
  categories: Category[];
  onOpen: (id: string) => void;
  onChanged?: () => void; // called after edit save
  onDeleted?: (id: string) => void;
}

export function CollectionCard({ collection, categories, onOpen, onChanged, onDeleted }: CollectionCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleSaved = (_updated: any) => {
    // Ask parent to refresh collections list
    onChanged?.();
  };

  const confirmDelete = async () => {
    if (!collection?.id) {
      console.warn('Delete requested for collection without id');
      setIsDeleteOpen(false);
      return;
    }
    try {
      const resp = await fetch(`/api/collections/${encodeURIComponent(collection.id)}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete collection');
      onDeleted?.(collection.id);
      setIsDeleteOpen(false);
    } catch (e) {
      console.error('Delete collection failed:', e);
    }
  };

  // Runtime guard: if a malformed item slips through, avoid crashing the UI
  const modelCount = collection?.modelIds ? collection.modelIds.length : 0;
  const collectionId = collection?.id;

  return (
    <Card
      className="flex flex-col cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={() => {
        if (collectionId) onOpen(collectionId);
      }}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted/40 flex items-center justify-center">
          {Array.isArray(collection?.images) && collection!.images!.length > 0 ? (
            <img
              src={collection!.images![0]}
              alt={collection?.name || 'Collection cover'}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <Folder className="w-14 h-14 text-primary/80" />
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary">Collection</Badge>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  title="Collection actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => { setIsEditOpen(true); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1">
        <h3 className="mb-1 font-medium line-clamp-2">{collection?.name || 'Untitled collection'}</h3>
        {collection?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
        )}
        {/* Primary/Secondary info rows following model card settings, when applicable */}
        <div className="text-muted-foreground space-y-1 mt-2">
          {(() => {
            // Read global config to respect modelCardPrimary/Secondary settings
            const effectiveCfg = ConfigManager.loadConfig();
            const primary = effectiveCfg?.settings?.modelCardPrimary || 'printTime';
            const secondary = effectiveCfg?.settings?.modelCardSecondary || 'filamentUsed';

            const fieldValue = (key: string): string => {
              switch (key) {
                case 'category': return collection?.category || '';
                // Non-applicable for collections; return empty so we can skip
                case 'printTime':
                case 'filamentUsed':
                case 'fileSize':
                case 'designer':
                case 'layerHeight':
                case 'nozzle':
                case 'price':
                default:
                  return '';
              }
            };

            const labelForKey = (key: string) => getLabel(key) + ':';

            const rows: Array<{ label: string; value: string }> = [];
            if (primary && primary !== 'none') {
              const v = fieldValue(primary);
              if (v) rows.push({ label: labelForKey(primary), value: v });
            }
            if (secondary && secondary !== 'none' && secondary !== primary) {
              const v = fieldValue(secondary);
              if (v) rows.push({ label: labelForKey(secondary), value: v });
            }

            if (rows.length === 0) return null;

            return rows.map((r, i) => (
              <div className="flex justify-between" key={i}>
                <span>{r.label}</span>
                <span>{r.value}</span>
              </div>
            ));
          })()}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Button variant="outline" size="sm" className="w-full justify-between">
          {`View ${modelCount} model${modelCount !== 1 ? 's' : ''}`}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>

  {/* Edit drawer */}
  <CollectionEditDrawer open={isEditOpen} onOpenChange={setIsEditOpen} collection={collection ?? null} categories={categories} onSaved={handleSaved} />

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the collection "{collection?.name || ''}" but won’t delete any models inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { await confirmDelete(); }}>{"Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
