export interface Model {
  id: string;
  name: string;
  thumbnail: string;
  images: string[];
  tags: string[];
  isPrinted: boolean;
  printTime: string;
  filamentUsed: string;
  category: string;
  description: string;
  fileSize: string;
  modelUrl: string;
  license: string;
  notes?: string;
  source?: string;
  price?: number;
  printSettings: {
    layerHeight: string;
    infill: string;
    supports: string;
  };
}