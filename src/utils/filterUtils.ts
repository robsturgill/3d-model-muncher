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
  sortBy?: string; // Optional sort field
}

export const applyFiltersToModels = (modelsToFilter: Model[], filters: FilterState) => {
  let filtered = modelsToFilter;

  // 1. Filter by Hidden Status
  if (!filters.showHidden) {
    filtered = filtered.filter(model => !model.hidden);
  }

  // 2. Filter by Missing Images
  if (filters.showMissingImages) {
    filtered = filtered.filter(model => {
      const hasParsedImages = model.parsedImages && model.parsedImages.length > 0;
      const hasUserImages = model.userDefined?.images && model.userDefined.images.length > 0;
      return !hasParsedImages && !hasUserImages;
    });
  }

  // 3. Search Filter (Updated to check File Paths/Folders)
  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter(model =>
      // Check Name
      model.name.toLowerCase().includes(term) ||
      // Check Tags
      (model.tags || []).some(tag => tag.toLowerCase().includes(term)) ||
      // Check File Path (Critical for Folder Navigation)
      (model.modelUrl || '').toLowerCase().includes(term) || 
      (model.filePath || '').toLowerCase().includes(term)
    );
  }

  // 4. Category Filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(model => model.category.toLowerCase() === filters.category.toLowerCase());
  }

  // 5. Print Status Filter
  if (filters.printStatus && filters.printStatus !== 'all') {
    filtered = filtered.filter(model => filters.printStatus === 'printed' ? model.isPrinted : !model.isPrinted);
  }

  // 6. License Filter
  if (filters.license && filters.license !== 'all') {
    filtered = filtered.filter(model => model.license === filters.license);
  }

  // 7. Tags Filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(model =>
      filters.tags.every(selectedTag => (model.tags || []).some(modelTag => modelTag.toLowerCase() === selectedTag.toLowerCase()))
    );
  }

  // 8. File Type Filter
  if (filters.fileType && filters.fileType !== 'all') {
    const ext = filters.fileType.toLowerCase();
    if (ext === 'collections') {
       // 'collections' type is handled by the UI separately (displaying collections grid), 
       // but if we need to filter models, we pass through or handle specific logic.
       // For now, standard behavior is usually to just show models matching extension.
    } else {
      filtered = filtered.filter(model => {
        const path = (model.filePath || model.modelUrl || '').toLowerCase();
        return path.endsWith('.' + ext);
      });
    }
  }

  return filtered;
};