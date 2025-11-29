import { unzipSync } from 'fflate';

export interface GcodeFilament {
  type: string;
  length: string;
  weight: string;
  density?: string;
  color?: string;
}

export interface GcodeMetadata {
  printTime?: string;
  filaments: GcodeFilament[];
  totalFilamentWeight?: string;
}

/**
 * Normalize time from seconds to human-readable format (Xh Ym Zs)
 * If hours are present, rounds up to the next minute and omits seconds
 */
export function normalizeTime(seconds: number): string {
  if (seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  let minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  // If hours are present, round up to next minute if there are any seconds
  if (hours > 0 && secs > 0) {
    minutes += 1;
  }
  
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    // Omit seconds when hours are present
  } else {
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);
  }
  
  return parts.join(' ');
}

/**
 * Estimate weight from filament length using cylinder volume formula
 * @param lengthMm - Length in millimeters
 * @param diameter - Filament diameter in mm (default 1.75)
 * @param density - Material density in g/cm³ (default 1.24 for PLA)
 */
export function estimateWeightFromLength(
  lengthMm: number,
  diameter: number = 1.75,
  density: number = 1.24
): number {
  const radiusMm = diameter / 2;
  const volumeMm3 = Math.PI * radiusMm * radiusMm * lengthMm;
  const volumeCm3 = volumeMm3 / 1000;
  return volumeCm3 * density;
}

/**
 * Extract G-code from a .gcode.3mf file
 * These files are archives containing G-code in Metadata/plate_N.gcode
 */
export function extractGcodeFrom3MF(buffer: Buffer): string {
  try {
    const unzipped = unzipSync(new Uint8Array(buffer));
    
    // Look for .gcode file in the archive
    // Priority order:
    // 1. Metadata/plate_1.gcode (most common BambuLab format)
    // 2. Any Metadata/plate_*.gcode file
    // 3. Any .gcode file at root level (backward compatibility)
    const candidates: Array<{ path: string; priority: number; data: Uint8Array }> = [];
    
    for (const [filename, data] of Object.entries(unzipped)) {
      if (filename === 'Metadata/plate_1.gcode') {
        candidates.push({ path: filename, priority: 1, data });
      } else if (filename.startsWith('Metadata/plate_') && filename.endsWith('.gcode')) {
        candidates.push({ path: filename, priority: 2, data });
      } else if (filename.endsWith('.gcode') && !filename.includes('/')) {
        candidates.push({ path: filename, priority: 3, data });
      }
    }
    
    if (candidates.length === 0) {
      throw new Error('No .gcode file found in 3MF archive. Expected Metadata/plate_1.gcode or similar.');
    }
    
    // Sort by priority and use the best match
    candidates.sort((a, b) => a.priority - b.priority);
    return new TextDecoder().decode(candidates[0].data);
  } catch (error) {
    throw new Error(`Failed to extract G-code from 3MF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse CSV or semicolon-separated values from G-code comment
 * BambuStudio uses different separators: comma for numbers, semicolon for strings
 */
function parseCSV(value: string): string[] {
  // Detect separator: if it contains semicolons, use those; otherwise use commas
  const separator = value.includes(';') ? ';' : ',';
  return value.split(separator).map(v => v.trim()).filter(v => v);
}

/**
 * Parse G-code file and extract metadata
 */
export function parseGcode(gcodeContent: string): GcodeMetadata {
  const lines = gcodeContent.split('\n').slice(0, 200); // Read first 200 lines for performance
  
  const metadata: GcodeMetadata = {
    filaments: []
  };
  
  let filamentLengths: string[] = [];
  let filamentWeights: string[] = [];
  let filamentTypes: string[] = [];
  let filamentDensities: string[] = [];
  let filamentColors: string[] = [];
  let printTimeSeconds: number | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Normalize leading semicolon plus optional space for robust matching
    const normalized = trimmed.replace(/^;\s*/, ';').toLowerCase();
    
    // BambuStudio format - print time
    if (normalized.includes('total estimated time:')) {
      // Format: "; model printing time: 3h 6m 5s; total estimated time: 3h 13m 52s"
      const match = trimmed.match(/total estimated time:\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?/i);
      if (match) {
        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const seconds = match[3] ? parseInt(match[3]) : 0;
        printTimeSeconds = hours * 3600 + minutes * 60 + seconds;
      }
    } else if (normalized.startsWith(';total filament length [mm]')) {
      const match = trimmed.match(/:\s*(.+)/);
      if (match) {
        filamentLengths = parseCSV(match[1]);
      }
    } else if (trimmed.startsWith(';total filament weight [g]')) {
      const match = trimmed.match(/:\s*(.+)/);
      if (match) {
        filamentWeights = parseCSV(match[1]);
      }
    } else if (normalized.startsWith(';filament_type')) {
      const match = trimmed.match(/=\s*(.+)/);
      if (match) {
        filamentTypes = parseCSV(match[1]);
      }
    } else if (normalized.startsWith(';filament_density')) {
      const match = trimmed.match(/:\s*(.+)/);
      if (match) {
        filamentDensities = parseCSV(match[1]);
      }
    } else if (normalized.includes('filament_colour =') || normalized.includes('filament_color =')) {
      // Match only lines with "filament_colour =" or "filament_color =", not "filament_colour_type"
      if (!normalized.includes('_type')) {
        const match = trimmed.match(/=\s*(.+)/);
        if (match) {
          filamentColors = parseCSV(match[1]);
        }
      }
    } else if (normalized.startsWith(';time:')) {
      // Cura format - time in seconds
      const match = trimmed.match(/;TIME:\s*(\d+)/i);
      if (match) {
        printTimeSeconds = parseInt(match[1], 10);
      }
    } else if (normalized.startsWith(';filament used:')) {
      // Cura format - filament length in meters
      const match = trimmed.match(/;Filament used:\s*([\d.]+)m/i);
      if (match) {
        const lengthMeters = parseFloat(match[1]);
        filamentLengths = [(lengthMeters * 1000).toFixed(2)]; // Convert to mm
      }
    }
  }
  
  // Build filaments array
  const maxFilaments = Math.max(
    filamentLengths.length,
    filamentWeights.length,
    filamentTypes.length
  );
  
  let totalWeight = 0;
  
  for (let i = 0; i < maxFilaments; i++) {
    const length = filamentLengths[i];
    const weight = filamentWeights[i];
    const type = filamentTypes[i] || 'Unknown';
    const density = filamentDensities[i];
    const color = filamentColors[i];
    
    let finalWeight = weight;
    
    // If weight not provided but length is, estimate it
    if (!weight && length) {
      const lengthMm = parseFloat(length);
      const densityVal = density ? parseFloat(density) : 1.24;
      const estimatedWeight = estimateWeightFromLength(lengthMm, 1.75, densityVal);
      finalWeight = estimatedWeight.toFixed(2);
    }
    
    if (length || weight) {
      metadata.filaments.push({
        type,
        length: length ? `${parseFloat(length).toFixed(2)}mm` : '',
        weight: finalWeight ? `${parseFloat(finalWeight).toFixed(2)}g` : '',
        density: density || undefined,
        color: color || undefined
      });
      
      if (finalWeight) {
        totalWeight += parseFloat(finalWeight);
      }
    }
  }
  
  // Set print time
  if (printTimeSeconds !== null) {
    metadata.printTime = normalizeTime(printTimeSeconds);
  }
  
  // Set total filament weight
  if (totalWeight > 0) {
    metadata.totalFilamentWeight = `${totalWeight.toFixed(2)}g`;
  }
  
  return metadata;
}
