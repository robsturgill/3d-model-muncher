// Utility to resolve a model thumbnail descriptor to an actual image URL/data
export function getUserImageData(entry: any): string {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
  return '';
}

export function resolveModelThumbnail(model: any): string {
  if (!model) return '';

  // Descriptor stored by UI in userDefined[0].thumbnail (e.g. 'parsed:0', 'user:1', or a literal data URL)
  const thumbnailDesc = (model as any)?.userDefined?.[0]?.thumbnail;

  if (thumbnailDesc && typeof thumbnailDesc === 'string') {
    if (thumbnailDesc.startsWith('parsed:')) {
      const idx = parseInt(thumbnailDesc.split(':')[1] || '', 10);
      if (!isNaN(idx)) {
        if (Array.isArray(model.parsedImages) && model.parsedImages[idx]) {
          return model.parsedImages[idx];
        }
        // legacy fallbacks
        if (idx === 0 && model.thumbnail) return model.thumbnail;
        if (Array.isArray(model.images) && model.images[idx - 1]) return model.images[idx - 1];
      }
    } else if (thumbnailDesc.startsWith('user:')) {
      const idx = parseInt(thumbnailDesc.split(':')[1] || '', 10);
      const userImages = (model as any)?.userDefined?.[0]?.images;
      if (!isNaN(idx) && Array.isArray(userImages) && userImages[idx]) {
        return getUserImageData(userImages[idx]);
      }
    } else {
      // treat as literal data URL or direct string
      return thumbnailDesc;
    }
  }

  // Prefer new parsedImages top-level field
  if (Array.isArray(model.parsedImages) && model.parsedImages.length > 0) {
    return model.parsedImages[0];
  }

  // Backwards-compatible fallbacks
  if (model.thumbnail) return model.thumbnail;
  if (Array.isArray(model.images) && model.images.length > 0) return model.images[0];

  return '';
}
