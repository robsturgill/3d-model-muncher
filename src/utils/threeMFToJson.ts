import * as fs from "fs";
import * as path from "path";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

interface PrintSettings {
  layerHeight: string;
  infill: string;
  nozzle: string;
  printer?: string;
}

interface ModelMetadata {
  id: string;
  name: string;
  // New simplified structure - only parsedImages, no legacy fields
  parsedImages: string[]; // All images extracted from 3MF file (thumbnail + additional images)
  tags: string[];
  isPrinted: boolean;
  printTime: string;
  filamentUsed: string;
  category: string;
  description: string;
  fileSize: string;
  modelUrl: string;
  license: string;
  designer?: string;
  notes: string;
  hash: string;
  printSettings: PrintSettings;
  price: number;
  userDefined?: {
    description?: string;
    thumbnail?: string;
    images?: string[];
    imageOrder?: string[];
  };
}

function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Utility to compute MD5 hash from a file path or buffer
export function computeMD5(input: string | Buffer | Uint8Array): string {
  const crypto = require('crypto');
  let buffer: Buffer | Uint8Array;
  if (typeof input === 'string') {
    // input is a file path
    const fs = require('fs');
    buffer = fs.readFileSync(input);
  } else {
    buffer = input;
  }
  return crypto.createHash('md5').update(buffer).digest('hex');
}

export async function parse3MF(filePath: string, id: string, precomputedHash?: string): Promise<ModelMetadata> {
  const buffer = fs.readFileSync(filePath);
  const size = fs.statSync(filePath).size;

  const metadata: ModelMetadata = {
    id: id,
    name: "", // Will be set from metadata or fallback to filename
    parsedImages: [], // All images extracted from 3MF file
    tags: [],
    isPrinted: false,
    printTime: "",
    filamentUsed: "",
    category: "Uncategorized",
    description: "",
    fileSize: bytesToMB(size),
    // Preserve subdirectory structure in the modelUrl so clients can
    // download the file from the correct location (e.g. /models/subdir/file.stl)
    modelUrl: (() => {
      try {
        const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        return '/' + relativePath;
      } catch (e) {
        return `/models/${path.basename(filePath)}`;
      }
    })(),
    license: "",
    notes: "",
    hash: "",
    printSettings: {
      layerHeight: "",
      infill: "",
      nozzle: "",
      printer: undefined
    },
    price: 0,
    userDefined: {}
  };

  try {
    const unzipped = unzipSync(new Uint8Array(buffer));

    // ---- PROJECT SETTINGS (preferred source for layer height / infill) ----
    if (unzipped["Metadata/project_settings.config"]) {
      try {
        const raw = new TextDecoder().decode(unzipped["Metadata/project_settings.config"]);
        let settings: any = {};

        // Try JSON first, then fall back to simple key=value or key: value parsing
        try {
          settings = JSON.parse(raw);
        } catch {
          raw.split(/\r?\n/).forEach((line) => {
            const m = line.match(/^\s*([^:=\s]+)\s*[:=]\s*(.+)$/);
            if (m) settings[m[1].trim()] = m[2].trim();
          });
        }

        if (settings.layer_height != null && settings.layer_height !== "") {
          // normalize: strip trailing "mm" if present, keep numeric string
          const lh = String(settings.layer_height).trim().replace(/mm$/i, "").trim();
          metadata.printSettings.layerHeight = lh;
        }

        // nozzle_diameter may be provided as an array. Use the first value if present.
        if (settings.nozzle_diameter != null && settings.nozzle_diameter !== "") {
          let nd: any = settings.nozzle_diameter;
          // If it's an array (parsed from JSON), take first element
          if (Array.isArray(nd)) nd = nd[0];
          // If it's a comma-separated string, take first segment
          if (typeof nd === 'string' && nd.indexOf(',') !== -1) nd = nd.split(',')[0];
          let nozzleStr = String(nd).trim();
          // strip trailing mm if present
          nozzleStr = nozzleStr.replace(/mm$/i, '').trim();
          metadata.printSettings.nozzle = nozzleStr;
        }

        // optional infill keys (if present in config)
  // include sparse_infill_density (used in project_settings.config) as the preferred infill key
  const infillKeyCandidates = ["sparse_infill_density"];
        for (const k of infillKeyCandidates) {
          if (settings[k] != null && settings[k] !== "") {
            let iv = String(settings[k]).trim();
            // ensure percent sign
            if (!/%$/.test(iv)) iv = iv.replace(/\s*%$/, "") + "%";
            metadata.printSettings.infill = iv;
            break;
          }
        }
      } catch (e) {
        console.warn("Could not parse Metadata/project_settings.config:", e);
      }
    }

    // Parse XML metadata
    if (unzipped["3D/3dmodel.model"]) {
      const xml = new TextDecoder().decode(unzipped["3D/3dmodel.model"]);
      const parser = new XMLParser({ ignoreAttributes: false });
      const json = parser.parse(xml);

      const modelNode = json?.model;
      const metadataNodes = modelNode?.metadata;

      function decodeHtmlEntities(text: string): string {
        // First decode HTML entities
        const decodedText = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
        
        // Then strip out any HTML tags
        return decodedText.replace(/<[^>]*>/g, '');
      }

      if (Array.isArray(metadataNodes)) {
        for (const m of metadataNodes) {
          const key = (m["@_name"] || "").toLowerCase();
          const value = m["#text"] || "";

          if (key === "title") {
            metadata.name = decodeHtmlEntities(value);
          }

          if (key === "designer") {
            // Preserve original (unescaped) designer string, but strip HTML tags/entities
            metadata.designer = decodeHtmlEntities(value).trim();
          }

          if (key === "description") {
            // Double decode because the XML contains &amp;lt; which needs to be decoded twice
            metadata.description = decodeHtmlEntities(decodeHtmlEntities(value));
          }
          
          if (key === "profiletitle") {
            // If layer height wasn't found in project_settings.config, fall back to parsing profiletitle
            if (!metadata.printSettings.layerHeight) {
              const layerMatch = value.match(/([\d.]+)mm layer/);
              if (layerMatch) metadata.printSettings.layerHeight = layerMatch[1];
            }

            // Parse infill from title only if not already set by config
            if (!metadata.printSettings.infill) {
              const infillMatch = value.match(/(\d+)% infill/);
              if (infillMatch) metadata.printSettings.infill = infillMatch[1] + "%";
            }
          }

          if (key.includes("license")) {
            metadata.license = value;
          }
          if (key.includes("estimatedprinttime")) {
            metadata.printTime = value + "s";
          }
          if (key.includes("filamentweight")) {
            metadata.filamentUsed = value + " g";
          }
        }
      } else if (metadataNodes) {
        const key = (metadataNodes["@_name"] || "").toLowerCase();
        const value = metadataNodes["#text"] || "";
        
        if (key === "title") {
          metadata.name = decodeHtmlEntities(value);
        }

        if (key === "description") {
          // Double decode because the XML contains &amp;lt; which needs to be decoded twice
          metadata.description = decodeHtmlEntities(decodeHtmlEntities(value));
        }

        if (key === "profiletitle") {
          // If layer height wasn't found in project_settings.config, fall back to parsing profiletitle
          if (!metadata.printSettings.layerHeight) {
            const layerMatch = value.match(/([\d.]+)mm layer/);
            if (layerMatch) metadata.printSettings.layerHeight = layerMatch[1];
          }

          // Parse infill from title only if not already set by config
          if (!metadata.printSettings.infill) {
            const infillMatch = value.match(/(\d+)% infill/);
            if (infillMatch) metadata.printSettings.infill = infillMatch[1] + "%";
          }
        }

        if (key === "designer") {
          metadata.designer = decodeHtmlEntities(value).trim();
        }

        if (key.includes("license")) {
          metadata.license = value;
        }
      }
    }

    // If no title was found in metadata, fallback to filename
    if (!metadata.name) {
      metadata.name = path.basename(filePath, ".3mf");
    }

    // ---- MD5 HASH ----
    metadata.hash = precomputedHash || computeMD5(buffer);

    // ---- IMAGE PROCESSING ----
    // Collect all images from the 3MF file into parsedImages array
    // First, add the primary thumbnail if it exists
    if (unzipped["Metadata/plate_1.png"]) {
      const b64 = Buffer.from(unzipped["Metadata/plate_1.png"]).toString("base64");
      const dataUrl = `data:image/png;base64,${b64}`;
      metadata.parsedImages.push(dataUrl);
    } else if (unzipped["Metadata/thumbnail.png"]) {
      const b64 = Buffer.from(unzipped["Metadata/thumbnail.png"]).toString("base64");
      const dataUrl = `data:image/png;base64,${b64}`;
      metadata.parsedImages.push(dataUrl);
    }

    // Add any additional images from Auxiliaries/Model Pictures/
    for (const file in unzipped) {
      if (file.startsWith("Auxiliaries/Model Pictures/") && file.endsWith(".webp")) {
        const b64 = Buffer.from(unzipped[file]).toString("base64");
        const dataUrl = `data:image/webp;base64,${b64}`;
        metadata.parsedImages.push(dataUrl);
      }
    }

    // Create userDefined.imageOrder based on parsedImages
    if (metadata.parsedImages.length > 0) {
      const imageOrder = metadata.parsedImages.map((_, index) => `parsed:${index}`);
      metadata.userDefined = {
        ...metadata.userDefined,
        imageOrder: imageOrder
      };
    }
  } catch (err) {
    console.error(`Error parsing 3MF file ${filePath}:`, err);
  }

  return metadata;
}


export async function parseSTL(filePath: string, id: string, precomputedHash?: string): Promise<ModelMetadata> {
  const buffer = fs.readFileSync(filePath);
  const size = fs.statSync(filePath).size;

  const metadata: ModelMetadata = {
    id: id,
    name: "", // Will be set from filename
    parsedImages: [], // STL files don't contain embedded images
    tags: [],
    isPrinted: false,
    printTime: "",
    filamentUsed: "",
    category: "",
    description: "",
    fileSize: bytesToMB(size),
    modelUrl: "",
    license: "",
    notes: "",
    hash: precomputedHash || computeMD5(buffer),
    printSettings: {
      layerHeight: "",
      infill: "",
      nozzle: "",
      printer: undefined
    },
    price: 0,
    userDefined: {}
  };

  // Use filename as name for STL files
  const fileName = path.basename(filePath, '.stl');
  metadata.name = fileName;
  
  // Set the model URL (relative to models directory)
  const relativePath = path.relative(process.cwd(), filePath);
  metadata.modelUrl = "/" + relativePath.replace(/\\/g, "/");

  return metadata;
}

// Generate a unique ID based on file path and content hash
function generateUniqueId(filePath: string, hash?: string): string {
  // Use the relative path from the models directory, normalize separators
  const relativePath = path.relative(process.cwd(), filePath);
  const normalizedPath = relativePath.replace(/[\/\\]/g, '-').replace(/\.(3mf|stl)$/i, '');
  
  // Clean the path to be safe for IDs (remove special characters)
  const cleanPath = normalizedPath.replace(/[^a-zA-Z0-9\-_]/g, '-');
  
  // If we have a hash, use the first 8 characters for uniqueness
  const hashSuffix = hash ? `-${hash.substring(0, 8)}` : '';
  
  // Create a unique ID combining path and hash
  return `${cleanPath}${hashSuffix}`;
}

export async function scanDirectory(dir: string, fileType: "3mf" | "stl" = "3mf"): Promise<{ processed: number; skipped: number; }> {

  async function recurse(currentDir: string): Promise<{ processed: number; skipped: number; }> {
    console.log(`Scanning: ${currentDir}`);

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let localProcessed = 0;
    let localSkipped = 0;

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const subResult = await recurse(fullPath);
        localProcessed += subResult.processed;
        localSkipped += subResult.skipped;
      } else if (entry.isFile()) {
        if (fileType === "3mf" && entry.name.endsWith(".3mf")) {
          // Skip .gcode.3mf and .3mf.gcode files (G-code archives, not models)
          const lowerName = entry.name.toLowerCase();
          if (lowerName.endsWith(".gcode.3mf") || lowerName.endsWith(".3mf.gcode")) {
            console.log(`⏭️ Skipping G-code archive: ${fullPath}`);
            localSkipped++;
            continue;
          }
          
          const outPath = fullPath.replace(/\.3mf$/, "-munchie.json");
          
          // Skip parsing if munchie.json already exists
          if (fs.existsSync(outPath)) {
            console.log(`⏭️ Skipping 3MF (JSON exists): ${fullPath}`);
            localSkipped++;
            continue;
          }

          console.log(`Parsing 3MF: ${fullPath}`);
          // Generate hash first to create unique ID
          const buffer = fs.readFileSync(fullPath);
          const hash = computeMD5(buffer);
          const uniqueId = generateUniqueId(fullPath, hash);
          const metadata = await parse3MF(fullPath, uniqueId, hash);

          fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), "utf-8");
          console.log(`✅ Created JSON for: ${outPath}`);
          localProcessed++;
        } else if (fileType === "stl" && entry.name.toLowerCase().endsWith(".stl")) {
          // For STL files, include the extension in the munchie.json filename to avoid conflicts
          const outPath = fullPath.replace(/\.stl$/i, "-stl-munchie.json");
          
          // Skip parsing if munchie.json already exists
          if (fs.existsSync(outPath)) {
            console.log(`⏭️ Skipping STL (JSON exists): ${fullPath}`);
            localSkipped++;
            continue;
          }

          console.log(`Parsing STL: ${fullPath}`);
          // Generate hash first to create unique ID
          const buffer = fs.readFileSync(fullPath);
          const hash = computeMD5(buffer);
          const uniqueId = generateUniqueId(fullPath, hash);
          const metadata = await parseSTL(fullPath, uniqueId, hash);

          fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), "utf-8");
          console.log(`✅ Created JSON for STL: ${outPath}`);
          localProcessed++;
        }
      }
    }

    return { processed: localProcessed, skipped: localSkipped };
  }

  const result = await recurse(dir);
  return result;
}

// To use: import { scanDirectory } and call it when needed (e.g., on button click)
