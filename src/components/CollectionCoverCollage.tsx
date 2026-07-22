import { Folder } from "lucide-react";
import type { Collection } from "../types/collection";
import type { Model } from "../types/model";
import { getCollectionCoverImages } from "../utils/collectionCoverUtils";

interface CollectionCoverCollageProps {
  collection: Collection;
  models?: Model[];
  className?: string;
  imageClassName?: string;
}

export function CollectionCoverCollage({
  collection,
  models = [],
  className = "",
  imageClassName = "",
}: CollectionCoverCollageProps) {
  const previewImages = getCollectionCoverImages(collection, models, 4);

  if (previewImages.length === 0) {
    return (
      <div className={`bg-muted/40 flex items-center justify-center ${className}`}>
        <Folder className="w-10 h-10 text-primary/80" />
      </div>
    );
  }

  return (
    <div className={`bg-muted/30 p-1 ${className}`}>
      <div className="grid w-full h-full grid-cols-2 grid-rows-2 gap-1">
        {Array.from({ length: 4 }, (_, index) => {
          const src = previewImages[index];
          return (
            <div key={index} className="overflow-hidden rounded-sm bg-muted/40">
              {src ? (
                <img
                  src={src}
                  alt=""
                  className={`w-full h-full object-cover ${imageClassName}`}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-muted/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
