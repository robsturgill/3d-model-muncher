import { Model, DuplicateGroup } from "../types/model";

/**
 * Finds duplicate files based on hash
 */
export function findDuplicates(models: Model[]): DuplicateGroup[] {
  const hashGroups = new Map<string, Model[]>();

  // Group models by hash
  models.forEach(model => {
    if (model.hash && model.hash !== 'ERROR') {
      if (!hashGroups.has(model.hash)) {
        hashGroups.set(model.hash, []);
      }
      hashGroups.get(model.hash)!.push(model);
    }
  });

  // Find groups with more than one model (duplicates)
  const duplicateGroups: DuplicateGroup[] = [];
  hashGroups.forEach((groupModels, hash) => {
    if (groupModels.length > 1) {
      const totalSizeBytes = groupModels.reduce((sum, model) => {
        const sizeStr = model.fileSize?.replace(/[^\d.]/g, '') || '0';
        const size = parseFloat(sizeStr);
        if (model.fileSize?.includes('GB')) return sum + (size * 1024 * 1024 * 1024);
        if (model.fileSize?.includes('MB')) return sum + (size * 1024 * 1024);
        if (model.fileSize?.includes('KB')) return sum + (size * 1024);
        return sum + size;
      }, 0);
      
      const totalSize = formatFileSize(totalSizeBytes);

      duplicateGroups.push({
        hash,
        models: groupModels,
        totalSize
      });
    }
  });

  return duplicateGroups;
}

/**
 * Removes duplicate models from the list, keeping only the specified model
 */
export function removeDuplicates(models: Model[], duplicateGroup: DuplicateGroup, keepModelId: string): Model[] {
  const modelsToRemove = duplicateGroup.models
    .filter(model => model.id !== keepModelId)
    .map(model => model.id);

  return models.filter(model => !modelsToRemove.includes(model.id));
}

/**
 * Calculates storage space that would be saved by removing duplicates
 */
export function calculateSpaceSavings(duplicateGroups: DuplicateGroup[]): string {
  let totalSavings = 0;

  duplicateGroups.forEach(group => {
    if (group.models.length > 1) {
      const fileSize = group.models[0]?.fileSize;
      const singleFileSize = parseFileSize(fileSize);
      const duplicateFiles = group.models.length - 1;
      totalSavings += singleFileSize * duplicateFiles;
    }
  });

  return formatFileSize(totalSavings);
}

/**
 * Parse file size string to bytes
 */
function parseFileSize(sizeStr: string | undefined | null): number {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  const size = parseFloat(sizeStr.replace(/[^\d.]/g, ''));
  if (sizeStr.includes('GB')) return size * 1024 * 1024 * 1024;
  if (sizeStr.includes('MB')) return size * 1024 * 1024;
  if (sizeStr.includes('KB')) return size * 1024;
  return size;
}

/**
 * Format bytes to human readable file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
