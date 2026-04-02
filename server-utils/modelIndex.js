/**
 * In-memory metadata index for fast model lookups.
 *
 * Builds a lightweight Map of model metadata on startup so that
 * /api/models no longer needs to recursively read every munchie.json
 * on every request.  The index is kept in sync via explicit
 * update/add/remove calls from the mutation endpoints.
 */

const fs = require('fs');
const path = require('path');

/** @type {Map<string, object>} id -> lightweight entry */
let index = new Map();

/** Absolute path to the models root directory */
let modelsRoot = '';

/**
 * Extract a lightweight entry from a full munchie.json object.
 * Strips out parsedImages and userDefined.images (the heavy base64 blobs)
 * but keeps everything else needed for listings, filtering, and sorting.
 */
function toLightweight(model, munchieJsonPath) {
  const entry = {
    id: model.id,
    name: model.name,
    filePath: model.filePath,
    modelUrl: model.modelUrl,
    tags: Array.isArray(model.tags) ? model.tags : [],
    isPrinted: !!model.isPrinted,
    printTime: model.printTime || '',
    filamentUsed: model.filamentUsed || '',
    category: model.category || '',
    description: model.description || '',
    fileSize: model.fileSize || '',
    license: model.license || '',
    designer: model.designer || '',
    notes: model.notes || '',
    source: model.source || '',
    price: model.price || 0,
    hidden: !!model.hidden,
    hash: model.hash || '',
    created: model.created || '',
    lastModified: model.lastModified || '',
    related_files: model.related_files || [],
    printSettings: model.printSettings || { layerHeight: '', infill: '', nozzle: '' },
    gcodeData: model.gcodeData || undefined,
    // Image metadata (counts/descriptors, not the actual blobs)
    hasImages: false,
    imageCount: 0,
    thumbnailDescriptor: '',
    // URL for the thumbnail endpoint (used by frontend grid view)
    thumbnailUrl: '',
    // Internal bookkeeping — not sent to the client
    _munchieJsonPath: munchieJsonPath,
  };

  // Compute image metadata
  const parsedCount = Array.isArray(model.parsedImages) ? model.parsedImages.length : 0;
  const userImages = model.userDefined && Array.isArray(model.userDefined.images) ? model.userDefined.images : [];
  entry.imageCount = parsedCount + userImages.length;
  entry.hasImages = entry.imageCount > 0;
  entry.thumbnailDescriptor = (model.userDefined && model.userDefined.thumbnail) || (parsedCount > 0 ? 'parsed:0' : '');
  if (entry.hasImages && entry.id) {
    entry.thumbnailUrl = `/api/model-thumbnail/${encodeURIComponent(entry.id)}`;
  }

  return entry;
}

/**
 * Given a munchie.json filename and the models root, derive the model file
 * path (filePath) and URL (modelUrl), validating the model file exists.
 * Returns null if the corresponding model file is missing.
 */
function deriveModelPaths(munchieFileName, munchieFullPath, absoluteModelsPath) {
  const relativePath = path.relative(absoluteModelsPath, munchieFullPath);

  if (munchieFileName.endsWith('-stl-munchie.json')) {
    if (munchieFileName.includes('-stl-munchie.json_')) return null; // malformed

    const baseFilePath = relativePath.replace('-stl-munchie.json', '');
    // Try both .stl and .STL extensions
    let stlFilePath = baseFilePath + '.stl';
    let absoluteStlPath = path.join(absoluteModelsPath, stlFilePath);

    if (!fs.existsSync(absoluteStlPath)) {
      stlFilePath = baseFilePath + '.STL';
      absoluteStlPath = path.join(absoluteModelsPath, stlFilePath);
    }

    if (!fs.existsSync(absoluteStlPath)) return null;

    return {
      filePath: stlFilePath,
      modelUrl: '/models/' + stlFilePath.replace(/\\/g, '/'),
    };
  }

  // 3MF
  if (munchieFileName.includes('-munchie.json_')) return null; // malformed

  const threeMfFilePath = relativePath.replace('-munchie.json', '.3mf');
  const absoluteThreeMfPath = path.join(absoluteModelsPath, threeMfFilePath);

  if (!fs.existsSync(absoluteThreeMfPath)) return null;

  return {
    filePath: threeMfFilePath,
    modelUrl: '/models/' + threeMfFilePath.replace(/\\/g, '/'),
  };
}

/**
 * Recursively scan `directory` for munchie.json files and add each to the index.
 */
function scanDirectory(directory, absoluteModelsPath) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (e) {
    console.warn(`[modelIndex] Unable to read directory ${directory}:`, e.message);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden directories (like .munchie_media)
      if (entry.name.startsWith('.')) continue;
      scanDirectory(fullPath, absoluteModelsPath);
    } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        if (!fileContent || fileContent.trim().length === 0) continue;
        const model = JSON.parse(fileContent);

        const paths = deriveModelPaths(entry.name, fullPath, absoluteModelsPath);
        if (!paths) continue;

        model.filePath = paths.filePath;
        model.modelUrl = paths.modelUrl;

        const lightweight = toLightweight(model, fullPath);
        if (lightweight.id) {
          index.set(lightweight.id, lightweight);
        }
      } catch (e) {
        console.error(`[modelIndex] Error reading ${fullPath}:`, e.message);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build (or rebuild) the full index from disk.
 * @param {string} absoluteModelsPath - absolute path to the models root
 */
function buildIndex(absoluteModelsPath) {
  const start = Date.now();
  modelsRoot = absoluteModelsPath;
  index = new Map();
  scanDirectory(absoluteModelsPath, absoluteModelsPath);
  console.log(`[modelIndex] Index built: ${index.size} model(s) in ${Date.now() - start}ms`);
}

/** Alias for buildIndex — rebuild the entire index from scratch. */
function rebuild() {
  if (!modelsRoot) {
    console.warn('[modelIndex] Cannot rebuild: no modelsRoot set. Call buildIndex first.');
    return;
  }
  buildIndex(modelsRoot);
}

/**
 * Get all lightweight entries as an array (for /api/models).
 * Strips internal bookkeeping fields before returning.
 */
function getAll() {
  const results = [];
  for (const entry of index.values()) {
    const { _munchieJsonPath, ...clientEntry } = entry;
    results.push(clientEntry);
  }
  return results;
}

/** Get a single lightweight entry by id. */
function get(id) {
  const entry = index.get(id);
  if (!entry) return null;
  const { _munchieJsonPath, ...clientEntry } = entry;
  return clientEntry;
}

/** Get the absolute munchie.json path for a model id (for fast file lookup). */
function getMunchieJsonPath(id) {
  const entry = index.get(id);
  return entry ? entry._munchieJsonPath : null;
}

/**
 * Update an existing entry.  Reads the munchie.json from disk and rebuilds
 * the lightweight entry so the index stays consistent.
 * @param {string} id
 * @param {string} [munchieJsonPath] - if known, skip the lookup
 */
function updateFromDisk(id, munchieJsonPath) {
  const jsonPath = munchieJsonPath || getMunchieJsonPath(id);
  if (!jsonPath) return false;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    if (!raw || raw.trim().length === 0) return false;
    const model = JSON.parse(raw);

    const fileName = path.basename(jsonPath);
    const paths = deriveModelPaths(fileName, jsonPath, modelsRoot);
    if (!paths) {
      // Model file no longer exists — remove from index
      index.delete(id);
      return false;
    }

    model.filePath = paths.filePath;
    model.modelUrl = paths.modelUrl;

    const lightweight = toLightweight(model, jsonPath);
    if (lightweight.id) {
      index.set(lightweight.id, lightweight);
    }
    return true;
  } catch (e) {
    console.error(`[modelIndex] updateFromDisk error for ${id}:`, e.message);
    return false;
  }
}

/**
 * Add a new model to the index from its munchie.json path.
 * @param {string} munchieJsonPath - absolute path
 */
function addFromDisk(munchieJsonPath) {
  try {
    const raw = fs.readFileSync(munchieJsonPath, 'utf8');
    if (!raw || raw.trim().length === 0) return null;
    const model = JSON.parse(raw);

    const fileName = path.basename(munchieJsonPath);
    const paths = deriveModelPaths(fileName, munchieJsonPath, modelsRoot);
    if (!paths) return null;

    model.filePath = paths.filePath;
    model.modelUrl = paths.modelUrl;

    const lightweight = toLightweight(model, munchieJsonPath);
    if (lightweight.id) {
      index.set(lightweight.id, lightweight);
    }
    return lightweight.id || null;
  } catch (e) {
    console.error(`[modelIndex] addFromDisk error for ${munchieJsonPath}:`, e.message);
    return null;
  }
}

/** Remove a model from the index by id. */
function remove(id) {
  return index.delete(id);
}

/** Return the current number of indexed models. */
function size() {
  return index.size;
}

/** Get the models root path. */
function getModelsRoot() {
  return modelsRoot;
}

module.exports = {
  buildIndex,
  rebuild,
  getAll,
  get,
  getMunchieJsonPath,
  updateFromDisk,
  addFromDisk,
  remove,
  size,
  getModelsRoot,
};
