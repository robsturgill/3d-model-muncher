export type SortKey = 'none' | 'modified_desc' | 'modified_asc' | 'name_asc' | 'name_desc';

export const getModelTimestamp = (m: any): number => {
  const v = m?.lastModified || m?.created || '';
  const t = Date.parse(v || '');
  return isNaN(t) ? 0 : t;
};

export const sortModels = (models: any[], sortBy: SortKey = 'none') => {
  if (!sortBy || sortBy === 'none') return models;
  const copy = models.slice();
  switch (sortBy) {
    case 'modified_desc':
      copy.sort((a, b) => getModelTimestamp(b) - getModelTimestamp(a));
      break;
    case 'modified_asc':
      copy.sort((a, b) => getModelTimestamp(a) - getModelTimestamp(b));
      break;
    case 'name_asc':
      copy.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
      break;
    case 'name_desc':
      copy.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''));
      break;
    default:
      break;
  }
  return copy;
};

// Collections have similar fields (name, created, lastModified); provide a parallel sorter
export const getCollectionTimestamp = (c: any): number => {
  const v = c?.lastModified || c?.created || '';
  const t = Date.parse(v || '');
  return isNaN(t) ? 0 : t;
};

export const sortCollections = (collections: any[], sortBy: SortKey = 'none') => {
  if (!sortBy || sortBy === 'none') return collections;
  const copy = collections.slice();
  switch (sortBy) {
    case 'modified_desc':
      copy.sort((a, b) => getCollectionTimestamp(b) - getCollectionTimestamp(a));
      break;
    case 'modified_asc':
      copy.sort((a, b) => getCollectionTimestamp(a) - getCollectionTimestamp(b));
      break;
    case 'name_asc':
      copy.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
      break;
    case 'name_desc':
      copy.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''));
      break;
    default:
      break;
  }
  return copy;
};
