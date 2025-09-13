import * as fs from "fs";
import * as path from "path";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

interface PrintSettings {
  layerHeight: string;
  infill: string;
  nozzle: string;
}

interface ModelMetadata {
  id: string;
  name: string;
  thumbnail: string; // base64 string
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
  notes: string;
  hash: string;
  printSettings: PrintSettings;
  price: number;
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

export async function parse3MF(filePath: string, id: number): Promise<ModelMetadata> {
  const buffer = fs.readFileSync(filePath);
  const size = fs.statSync(filePath).size;

  const metadata: ModelMetadata = {
    id: id.toString(),
    name: "", // Will be set from metadata or fallback to filename
    thumbnail: "",
    images: [],
    tags: [],
    isPrinted: false,
    printTime: "",
    filamentUsed: "",
    category: "Uncategorized",
    description: "",
    fileSize: bytesToMB(size),
    modelUrl: `/models/${path.basename(filePath)}`,
    license: "",
    notes: "",
    hash: "",
    printSettings: {
      layerHeight: "",
      infill: "",
      nozzle: ""
    },
    price: 0
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
    metadata.hash = computeMD5(buffer);

    // ---- THUMBNAIL SELECTION ----
    if (unzipped["Metadata/plate_1.png"]) {
      const b64 = Buffer.from(unzipped["Metadata/plate_1.png"]).toString("base64");
      metadata.thumbnail = `data:image/png;base64,${b64}`;
    } else if (unzipped["Metadata/thumbnail.png"]) {
      const b64 = Buffer.from(unzipped["Metadata/thumbnail.png"]).toString("base64");
      metadata.thumbnail = `data:image/png;base64,${b64}`;
    }

    // ---- ADDITIONAL IMAGES ----
    for (const file in unzipped) {
      if (file.startsWith("Auxiliaries/Model Pictures/") && file.endsWith(".webp")) {
        const b64 = Buffer.from(unzipped[file]).toString("base64");
        metadata.images.push(`data:image/png;base64,${b64}`);
      }
    }
  } catch (err) {
    console.error(`Error parsing 3MF file ${filePath}:`, err);
  }

  return metadata;
}


export async function scanDirectory(dir: string): Promise<void> {
  let idCounter = 1;

  async function recurse(currentDir: string) {
    console.log(`Scanning: ${currentDir}`);

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".3mf")) {
          console.log(`Parsing 3MF: ${fullPath}`);
          const metadata = await parse3MF(fullPath, idCounter++);
          const outPath = fullPath.replace(/\.3mf$/, "-munchie.json");

          // If munchie.json exists, preserve tags, isPrinted, category, notes, price
          if (fs.existsSync(outPath)) {
            try {
              const existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
              if (Array.isArray(existing.tags)) metadata.tags = existing.tags;
              if (typeof existing.isPrinted === "boolean") metadata.isPrinted = existing.isPrinted;
              if (typeof existing.category === "string") metadata.category = existing.category;
              if (typeof existing.notes === "string") metadata.notes = existing.notes;
              if (typeof existing.price === "number") metadata.price = existing.price;
            } catch (e) {
              console.warn(`Could not preserve fields from ${outPath}:`, e);
            }
          }

          fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), "utf-8");
          console.log(`✅ Created JSON for: ${outPath}`);
        }
      }
    }
  }

  recurse(dir);
}

// To use: import { scanDirectory } and call it when needed (e.g., on button click)
