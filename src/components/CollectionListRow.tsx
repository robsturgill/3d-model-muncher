import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import CollectionEditDrawer from "./CollectionEditDrawer";
import { ImageWithFallback } from "./ImageWithFallback";
import type { Collection } from "../types/collection";
import type { Category } from "../types/category";

interface CollectionListRowProps {
  collection: Collection;
  categories: Category[];
  onOpen: (id: string) => void;
  onChanged?: () => void;
  onDeleted?: (id: string) => void;
}

export function CollectionListRow({ collection, categories, onOpen, onChanged, onDeleted }: CollectionListRowProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const collectionId = collection?.id;
  const modelCount = Array.isArray(collection?.modelIds) ? collection.modelIds.length : 0;

  const handleOpen = () => {
    if (collectionId) {
      onOpen(collectionId);
    }
  };

  const handleSaved = () => {
    setIsEditOpen(false);
    onChanged?.();
  };

  const confirmDelete = async () => {
    if (!collectionId) {
      setIsDeleteOpen(false);
      return;
    }

    try {
      const resp = await fetch(`/api/collections/${encodeURIComponent(collectionId)}`, { method: "DELETE" });
      if (!resp.ok) {
        throw new Error("Failed to delete collection");
      }

      onDeleted?.(collectionId);
      onChanged?.();
    } catch (error) {
      console.error("Delete collection failed:", error);
    } finally {
      setIsDeleteOpen(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
        onClick={handleOpen}
      >
        <div className="flex-shrink-0 pl-1">
          <div className="relative">
            <ImageWithFallback
              src={collection?.images && collection.images.length > 0 ? collection.images[0] : ""}
              alt={collection?.name || "Collection image"}
              className="w-20 h-20 object-cover rounded-lg border group-hover:border-primary/30 transition-colors"
              draggable={false}
            />
            <Badge variant="secondary" className="absolute top-2 left-2 text-xs pointer-events-none">
              Collection
            </Badge>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold group-hover:text-primary transition-colors truncate text-lg">
                {collection?.name || "Untitled collection"}
              </h3>
              {collection?.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {collection.description}
                </p>
              )}
              {collection?.category && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs font-medium">
                    {collection.category}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="whitespace-nowrap">
                {modelCount} item{modelCount === 1 ? "" : "s"}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(event) => event.stopPropagation()}
                    title="Collection actions"
                    aria-label="Collection actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <CollectionEditDrawer
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        collection={collection ?? null}
        categories={categories}
        onSaved={handleSaved}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the collection "{collection?.name || ""}" but won’t delete any models inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
