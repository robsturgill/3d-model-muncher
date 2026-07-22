import type { Collection } from "../types/collection";
import type { Model } from "../types/model";
import { resolveModelThumbnail } from "./thumbnailUtils";

export function getCollectionCoverImages(collection: Collection, models: Model[] = [], limit = 4): string[] {
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const thumbnails = (collection?.modelIds || [])
    .map((modelId) => modelMap.get(modelId))
    .map((model) => (model ? resolveModelThumbnail(model) : ""))
    .filter((src): src is string => Boolean(src));

  if (thumbnails.length > 0) {
    return thumbnails.slice(0, limit);
  }

  if (Array.isArray(collection?.images) && collection.images.length > 0) {
    return collection.images.slice(0, 1);
  }

  return [];
}

export function resolveCollectionCoverImage(collection: Collection, models: Model[] = []): string {
  if (collection?.coverModelId) {
    const coverModel = models.find((model) => model.id === collection.coverModelId);
    const coverSrc = coverModel ? resolveModelThumbnail(coverModel) : "";
    if (coverSrc) return coverSrc;
  }

  if (Array.isArray(collection?.images) && collection.images.length > 0) {
    return collection.images[0];
  }

  return "";
}

export function getValidCollectionCoverId(modelIds: string[] = [], requestedCoverModelId?: string): string | undefined {
  if (!Array.isArray(modelIds) || modelIds.length === 0) return undefined;
  if (requestedCoverModelId && modelIds.includes(requestedCoverModelId)) {
    return requestedCoverModelId;
  }
  return modelIds[0];
}
