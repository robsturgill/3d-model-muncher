// --- 3MF Directory Scan and JSON Generation ---
import { scanDirectory as scan3MFDirectory } from "./threeMFToJson";
import * as path from "path";
import * as fs from "fs";
// Import the real parse3MF function for extracting metadata from a .3mf file
// Note: parse3MF is not exported, so we need to export it from threeMFToJson.ts
import { parse3MF as realParse3MF } from "./threeMFToJson";

/**
 * Scans a directory for .3mf files and generates JSON metadata for each.
 * Uses the scanDirectory function from threeMFToJson.ts
 * @param dir Directory to scan
 */
export function generate3MFJsonForDirectory(dir: string) {
  scan3MFDirectory(dir);
}
import { Model, DuplicateGroup, HashCheckResult, CorruptedFile } from "../types/model";

/**
 * Simulates generating a file hash for a model
 * In a real implementation, this would read the actual file and generate a hash
 */
export function generateFileHash(modelUrl: string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate hash generation with a delay
    setTimeout(() => {
      // Generate a mock hash based on the URL for consistency
      const mockHash = btoa(modelUrl).slice(0, 32);
      resolve(mockHash);
    }, Math.random() * 500 + 100);
  });
}

/**
 * Scans a real .3mf file to extract metadata using the real parse3MF function.
 * Returns a Partial<Model> with extracted fields, or simulated if not found.
 */
export function scanModelFile(model: Model): Promise<Partial<Model>> {
  return new Promise((resolve) => {
    try {
      // Try to resolve the real file path from modelUrl
      // Remove leading /models/ if present
      let fileName = model.modelUrl.replace(/^\/models\//, "");
      // Try both relative to process.cwd() and absolute
      let filePath = path.resolve("models", fileName);
      if (!fs.existsSync(filePath)) {
        // fallback: try as absolute path
        filePath = fileName;
      }
      if (fs.existsSync(filePath)) {
        // Use the real parse3MF function
        const metadata = realParse3MF(filePath, Number(model.id) || 1);
        resolve({
          ...metadata,
          lastScanned: new Date().toISOString(),
        });
        return;
      }
    } catch (e) {
      // fallback to simulation below
    }
    // Fallback: Simulate file scanning and metadata extraction
    setTimeout(() => {
      const scannedData: Partial<Model> = {
        hash: btoa(model.modelUrl).slice(0, 32),
        lastScanned: new Date().toISOString(),
        fileSize: model.fileSize,
      };
      resolve(scannedData);
    }, Math.random() * 1000 + 200);
  });
}

/**
 * Performs hash check on all models
 */
export async function performHashCheck(models: Model[]): Promise<HashCheckResult> {
  const totalFiles = models.length;
  let checkedFiles = 0;
  let corruptedFiles = 0;
  const corruptedFileDetails: CorruptedFile[] = [];
  const updatedModels: Model[] = [];

  // Simulate checking each file
  for (const model of models) {
    try {
      const hash = await generateFileHash(model.modelUrl);
      const isCorrupted = Math.random() < 0.05; // 5% chance of corruption for demo
      
      if (isCorrupted) {
        corruptedFiles++;
        corruptedFileDetails.push({
          model,
          error: "File integrity check failed - hash mismatch detected",
          expectedHash: "Expected valid hash",
          actualHash: "CORRUPTED",
          filePath: model.modelUrl
        });
        
        updatedModels.push({
          ...model,
          hash: 'CORRUPTED',
          lastScanned: new Date().toISOString()
        });
      } else {
        updatedModels.push({
          ...model,
          hash: hash,
          lastScanned: new Date().toISOString()
        });
      }
      
      checkedFiles++;
    } catch (error) {
      corruptedFiles++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      corruptedFileDetails.push({
        model,
        error: `File access error: ${errorMessage}`,
        actualHash: "ERROR",
        filePath: model.modelUrl
      });
      
      updatedModels.push({
        ...model,
        hash: 'ERROR',
        lastScanned: new Date().toISOString()
      });
    }
  }

  // Find duplicates
  const duplicateGroups = findDuplicates(updatedModels);

  return {
    totalFiles,
    checkedFiles,
    corruptedFiles,
    corruptedFileDetails,
    duplicateGroups,
    lastCheck: new Date().toISOString()
  };
}

/**
 * Finds duplicate files based on hash
 */
export function findDuplicates(models: Model[]): DuplicateGroup[] {
  const hashGroups = new Map<string, Model[]>();

  // Group models by hash
  models.forEach(model => {
    if (model.hash && model.hash !== 'CORRUPTED' && model.hash !== 'ERROR') {
      if (!hashGroups.has(model.hash)) {
        hashGroups.set(model.hash, []);
      }
      hashGroups.get(model.hash)!.push(model);
    }
  });

  // Filter groups with more than one model (duplicates)
  const duplicateGroups: DuplicateGroup[] = [];
  hashGroups.forEach((models, hash) => {
    if (models.length > 1) {
      const totalSizeBytes = models.reduce((sum, model) => {
        const sizeStr = model.fileSize.replace(/[^\d.]/g, '');
        const size = parseFloat(sizeStr);
        return sum + (model.fileSize.includes('MB') ? size * 1024 * 1024 : size * 1024);
      }, 0);
      
      const totalSize = formatFileSize(totalSizeBytes);

      duplicateGroups.push({
        hash,
        models,
        totalSize
      });
    }
  });

  return duplicateGroups.sort((a, b) => b.models.length - a.models.length);
}

/**
 * Formats file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Simulates scanning the model directory for new files
 */
export async function scanModelDirectory(): Promise<Model[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real implementation, this would scan the actual filesystem
      // For now, we'll just return the existing models with updated scan times
      resolve([]);
    }, 2000);
  });
}

/**
 * Removes duplicate models, keeping the first occurrence
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