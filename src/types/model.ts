import type { License } from '../constants/licenses';

export interface Model {
  filePath: string;
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
  license: License | string;
  notes?: string;
  source?: string;
  price?: number;
  hidden?: boolean;
  // List of user-provided related files (relative paths). Example: "prints/part-supports.zip"
  related_files?: string[];
  printSettings: {
    layerHeight: string;
    infill: string;
    nozzle: string;
  };

  // Added for file integrity and duplicate detection
  hash?: string;
  lastScanned?: string;
}

// Group of duplicate models by hash
export interface DuplicateGroup {
  hash: string;
  models: Model[];
  totalSize: string;
}

// Details for a corrupted file
export interface CorruptedFile {
  model: Model;
  error: string;
  expectedHash?: string;
  actualHash: string;
  filePath: string;
}

// Result of a hash check operation
export interface HashCheckResult {
  verified: number;
  corrupted: number;
  skipped?: number;
  duplicateGroups: DuplicateGroup[];
  corruptedFiles: CorruptedFile[];
  corruptedFileDetails: CorruptedFile[];
  lastCheck: string;
}