"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMD5 = computeMD5;
exports.parse3MF = parse3MF;
exports.scanDirectory = scanDirectory;
const fs = require("fs");
const path = require("path");
const fflate_1 = require("fflate");
const fast_xml_parser_1 = require("fast-xml-parser");
function bytesToMB(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
// Utility to compute MD5 hash from a file path or buffer
function computeMD5(input) {
    const crypto = require('crypto');
    let buffer;
    if (typeof input === 'string') {
        // input is a file path
        const fs = require('fs');
        buffer = fs.readFileSync(input);
    }
    else {
        buffer = input;
    }
    return crypto.createHash('md5').update(buffer).digest('hex');
}
async function parse3MF(filePath, id) {
    const buffer = fs.readFileSync(filePath);
    const size = fs.statSync(filePath).size;
    const metadata = {
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
        price: ""
    };
    try {
        const unzipped = (0, fflate_1.unzipSync)(new Uint8Array(buffer));
        // Parse XML metadata
        if (unzipped["3D/3dmodel.model"]) {
            const xml = new TextDecoder().decode(unzipped["3D/3dmodel.model"]);
            const parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false });
            const json = parser.parse(xml);
            const modelNode = json === null || json === void 0 ? void 0 : json.model;
            const metadataNodes = modelNode === null || modelNode === void 0 ? void 0 : modelNode.metadata;
            if (Array.isArray(metadataNodes)) {
                for (const m of metadataNodes) {
                    const key = (m["@_name"] || "").toLowerCase();
                    if (key.includes("license")) {
                        metadata.license = m["#text"] || "";
                    }
                    if (key.includes("estimatedprinttime")) {
                        metadata.printTime = m["#text"] + "s";
                    }
                    if (key.includes("filamentweight")) {
                        metadata.filamentUsed = m["#text"] + " g";
                    }
                }
            }
            else if (metadataNodes) {
                const key = (metadataNodes["@_name"] || "").toLowerCase();
                if (key.includes("license")) {
                    metadata.license = metadataNodes["#text"] || "";
                }
            }
        }
        // ---- MD5 HASH ----
        metadata.hash = computeMD5(buffer);
        // ---- THUMBNAIL SELECTION ----
        if (unzipped["Metadata/plate_1.png"]) {
            const b64 = Buffer.from(unzipped["Metadata/plate_1.png"]).toString("base64");
            metadata.thumbnail = `data:image/png;base64,${b64}`;
        }
        else if (unzipped["Metadata/thumbnail.png"]) {
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
    }
    catch (err) {
        console.error(`Error parsing 3MF file ${filePath}:`, err);
    }
    return metadata;
}
async function scanDirectory(dir) {
    let idCounter = 1;
    async function recurse(currentDir) {
        console.log(`Scanning: ${currentDir}`);
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                recurse(fullPath);
            }
            else if (entry.isFile()) {
                if (entry.name.endsWith(".3mf")) {
                    console.log(`Parsing 3MF: ${fullPath}`);
                    const metadata = await parse3MF(fullPath, idCounter++);
                    const outPath = fullPath.replace(/\.3mf$/, "-munchie.json");
                    // If munchie.json exists, preserve tags, isPrinted, category, notes, price
                    if (fs.existsSync(outPath)) {
                        try {
                            const existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
                            if (Array.isArray(existing.tags))
                                metadata.tags = existing.tags;
                            if (typeof existing.isPrinted === "boolean")
                                metadata.isPrinted = existing.isPrinted;
                            if (typeof existing.category === "string")
                                metadata.category = existing.category;
                            if (typeof existing.notes === "string")
                                metadata.notes = existing.notes;
                            if (typeof existing.price === "number")
                                metadata.price = existing.price;
                        }
                        catch (e) {
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
