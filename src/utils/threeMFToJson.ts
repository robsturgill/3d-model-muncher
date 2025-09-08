import * as fs from "fs";
import * as path from "path";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

interface PrintSettings {
  layerHeight: string;
  infill: string;
  supports: string;
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
    name: path.basename(filePath, ".3mf"),
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
      supports: ""
    },
    price: null
  };

  try {
    const unzipped = unzipSync(new Uint8Array(buffer));

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

          if (key === "description") {
            // Double decode because the XML contains &amp;lt; which needs to be decoded twice
            metadata.description = decodeHtmlEntities(decodeHtmlEntities(value));
            console.log("Found description:", metadata.description);
          }
          
          if (key === "profiletitle") {
            // Parse layer height from title (e.g., "0.2mm layer, 8 walls, 25% infill")
            const layerMatch = value.match(/([\d.]+)mm layer/);
            if (layerMatch) {
              metadata.printSettings.layerHeight = layerMatch[1];
              console.log("Found layer height from profile title:", layerMatch[1]);
            }

            // Parse infill from title
            const infillMatch = value.match(/(\d+)% infill/);
            if (infillMatch) {
              metadata.printSettings.infill = infillMatch[1] + "%";
              console.log("Found infill from profile title:", infillMatch[1] + "%");
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
        
        if (key === "description") {
          // Double decode because the XML contains &amp;lt; which needs to be decoded twice
          metadata.description = decodeHtmlEntities(decodeHtmlEntities(value));
          console.log("Found description:", metadata.description);
        }

        if (key === "profiletitle") {
          // Parse layer height from title
          const layerMatch = value.match(/([\d.]+)mm layer/);
          if (layerMatch) {
            metadata.printSettings.layerHeight = layerMatch[1];
            console.log("Found layer height from profile title:", layerMatch[1]);
          }

          // Parse infill from title
          const infillMatch = value.match(/(\d+)% infill/);
          if (infillMatch) {
            metadata.printSettings.infill = infillMatch[1] + "%";
            console.log("Found infill from profile title:", infillMatch[1] + "%");
          }
        }

        if (key.includes("license")) {
          metadata.license = value;
        }
      }
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
