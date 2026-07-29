import type { Collection } from "../types/collection";
import type { Model } from "../types/model";
import { resolveModelThumbnail } from "./thumbnailUtils";

/**
 * The single image a user has explicitly chosen to represent a collection:
 * an uploaded cover image, or a member model picked as the cover. Returns ""
 * when the user has not chosen one, in which case callers fall back to the
 * generated collage.
 */
export function resolveCollectionCoverImage(collection: Collection, models: Model[] = []): string {
  if (Array.isArray(collection?.images) && collection.images.length > 0) {
    return collection.images[0];
  }

  if (collection?.coverModelId) {
    const coverModel = models.find((model) => model.id === collection.coverModelId);
    const coverSrc = coverModel ? resolveModelThumbnail(coverModel) : "";
    if (coverSrc) return coverSrc;
  }

  return "";
}

/**
 * Thumbnails of the collection's first few members, used to build a collage
 * when the user has not set a cover of their own.
 */
export function getCollectionCoverImages(collection: Collection, models: Model[] = [], limit = 4): string[] {
  const modelMap = new Map(models.map((model) => [model.id, model]));
  return (collection?.modelIds || [])
    .map((modelId) => modelMap.get(modelId))
    .map((model) => (model ? resolveModelThumbnail(model) : ""))
    .filter((src): src is string => Boolean(src))
    .slice(0, limit);
}

/**
 * Keep a cover selection only while it still points at a member of the
 * collection. Never picks one on the user's behalf - an unset cover means
 * "show the collage", and silently writing modelIds[0] would make that
 * indistinguishable from a deliberate choice.
 */
export function getValidCollectionCoverId(modelIds: string[] = [], requestedCoverModelId?: string): string | undefined {
  if (!requestedCoverModelId || !Array.isArray(modelIds)) return undefined;
  return modelIds.includes(requestedCoverModelId) ? requestedCoverModelId : undefined;
}
