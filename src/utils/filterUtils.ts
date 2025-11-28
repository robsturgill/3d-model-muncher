import { Model } from "../types/model";

export interface FilterState {
  search: string;
  category: string;
  printStatus: string;
  license: string;
  fileType: string;
  tags: string[];
  showHidden: boolean;
  showMissingImages: boolean;
}

export const applyFiltersToModels = (modelsToFilter: Model[], filters: FilterState) => {
  let filtered = modelsToFilter;

  if (!filters.showHidden) {
    filtered = filtered.filter(model => !model.hidden);
  }

  if (filters.showMissingImages) {
    filtered = filtered.filter(model => {
      const hasParsedImages = model.parsedImages && model.parsedImages.length > 0;
      const hasUserImages = model.userDefined?.images && model.userDefined.images.length > 0;
      return !hasParsedImages && !hasUserImages;
    });
  }

  if (filters.search) {
    filtered = filtered.filter(model =>
      model.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (model.tags || []).some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
    );
  }

  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(model => model.category.toLowerCase() === filters.category.toLowerCase());
  }

  if (filters.printStatus && filters.printStatus !== 'all') {
    filtered = filtered.filter(model => filters.printStatus === 'printed' ? model.isPrinted : !model.isPrinted);
  }

  if (filters.license && filters.license !== 'all') {
    filtered = filtered.filter(model => model.license === filters.license);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(model =>
      filters.tags.every(selectedTag => (model.tags || []).some(modelTag => modelTag.toLowerCase() === selectedTag.toLowerCase()))
    );
  }

  if (filters.fileType && filters.fileType !== 'all') {
    const ext = filters.fileType.toLowerCase();
    filtered = filtered.filter(model => {
      const path = (model.filePath || model.modelUrl || '').toLowerCase();
      return path.endsWith('.' + ext);
    });
  }

  return filtered;
};
