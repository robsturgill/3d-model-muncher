export type LabelKey =
  | 'printTime'
  | 'filamentUsed'
  | 'fileSize'
  | 'category'
  | 'designer'
  | 'layerHeight'
  | 'nozzle'
  | 'price'
  | 'none';

const EN_LABELS: Record<LabelKey, string> = {
  printTime: 'Print Time',
  filamentUsed: 'Filament',
  fileSize: 'File Size',
  category: 'Category',
  designer: 'Designer',
  layerHeight: 'Layer Height',
  nozzle: 'Nozzle',
  price: 'Price',
  none: 'None'
};

export function getLabel(key: string, locale = 'en'): string {
  // For now support only English. Map unknown keys to the key itself.
  if (locale !== 'en') {
    // future: add locale-specific maps
  }
  return (EN_LABELS as Record<string, string>)[key] || String(key);
}

export default {
  getLabel
};
