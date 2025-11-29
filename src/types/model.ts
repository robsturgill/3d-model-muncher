import type { License } from '../constants/licenses';

export interface Model {
  filePath: string;
  id: string;
  name: string;
  // Deprecated fields - kept for backward compatibility
  thumbnail?: string;
  images?: string[];
  // New simplified structure
  parsedImages?: string[]; // All images extracted from 3MF file (thumbnail + additional images)
  tags: string[];
  isPrinted: boolean;
  printTime: string;
  filamentUsed: string;
  category: string;
  description: string;
  fileSize: string;
  modelUrl: string;
  license: License | string;
  designer?: string;
  notes?: string;
  source?: string;
  price?: number;
  hidden?: boolean;
  // List of user-provided related files (relative paths). Example: "prints/part-supports.zip"
  related_files?: string[];
  // Structured user-provided data. The first element is used for user edits such as
  // description and images (data URLs). Keep flexible to support additional fields.
    userDefined?: {
      description?: string;
      // During transition we accept both legacy string[] (data URLs) and the
      // newer object form with explicit ids. On save newer clients will write
      // objects with ids so images can be referenced by descriptor in imageOrder.
      images?: Array<string | { id: string; data: string }>;
      // Optional canonical image ordering for this user's structured data.
      // Stored under userDefined.imageOrder to avoid promoting base64 blobs
      // into the top-level model shape. Descriptors are strings like
      // "parsed:0", "parsed:1", or "user:<index>" (or future "user:<id>").
      imageOrder?: string[];
      [key: string]: any;
    };
  printSettings: {
    layerHeight: string;
    infill: string;
    nozzle: string;
    // Optional printer profile/model name; editable for STL only
    printer?: string;
  };
  gcodeData?: {
    printTime?: string;
    filaments: Array<{
      type: string;
      length: string;
      weight: string;
      density?: string;
      color?: string;
    }>;
    totalFilamentWeight?: string;
    gcodeFilePath?: string;
  };

  // Added for file integrity and duplicate detection
  hash?: string;
  lastScanned?: string;
  // Timestamps added by server: when munchie.json was first created and last modified
  created?: string;
  lastModified?: string;
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