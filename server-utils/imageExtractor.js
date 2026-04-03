/**
 * Extracts base64 images from munchie.json files to the centralized
 * .munchie_media/ directory, replacing inline base64 with filenames.
 *
 * Files are named using the model's MD5 hash for collision avoidance:
 *   {hash12}_{source}_{index}.{ext}
 *
 * After extraction, munchie.json gets imageVersion: 2 to mark migration.
 * The endpoint and thumbnail logic check this field to decide whether to
 * read from .munchie_media/ or parse base64 inline.
 */

const fs = require('fs');
const path = require('path');

function getMediaDir(modelsRoot) {
  return path.join(modelsRoot, '.munchie_media');
}

function ensureMediaDir(modelsRoot) {
  const mediaDir = getMediaDir(modelsRoot);
  fs.mkdirSync(mediaDir, { recursive: true });
  return mediaDir;
}

function getImageExtension(dataUrl) {
  const match = dataUrl.match(/^data:image\/([^;]+);base64,/);
  if (!match) return 'bin';
  const mime = match[1].toLowerCase();
  return { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp' }[mime] || mime;
}

/**
 * Canonical filename for a model image in .munchie_media/.
 * Uses first 12 chars of model hash + source + index.
 */
function getMediaFilename(modelHash, source, index, ext) {
  const prefix = (modelHash || 'unknown').slice(0, 12);
  return `${prefix}_${source}_${index}.${ext}`;
}

/**
 * Extract base64 images from a munchie.json to .munchie_media/.
 * Updates munchie.json in-place with filenames and sets imageVersion: 2.
 * Idempotent — skips files already at imageVersion: 2.
 *
 * @param {string} munchieJsonPath - absolute path to the munchie.json file
 * @param {string} modelsRoot - absolute path to the models root directory
 * @returns {{ migrated: boolean, skipped: boolean, error: string|null }}
 */
function extractImages(munchieJsonPath, modelsRoot) {
  try {
    const raw = fs.readFileSync(munchieJsonPath, 'utf8');
    if (!raw || raw.trim().length === 0) return { migrated: false, skipped: true, error: null };

    const model = JSON.parse(raw);
    if (model.imageVersion === 2) return { migrated: false, skipped: true, error: null };

    const mediaDir = ensureMediaDir(modelsRoot);
    const modelHash = model.hash || model.id || 'unknown';
    let changed = false;

    // Extract parsedImages (array of base64 data URLs)
    if (Array.isArray(model.parsedImages) && model.parsedImages.length > 0) {
      const newParsedImages = model.parsedImages.map((dataUrl, i) => {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
          return dataUrl; // already a filename or invalid, keep as-is
        }
        const ext = getImageExtension(dataUrl);
        const filename = getMediaFilename(modelHash, 'parsed', i, ext);
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(path.join(mediaDir, filename), Buffer.from(base64Data, 'base64'));
        changed = true;
        return filename;
      });
      model.parsedImages = newParsedImages;
    }

    // Extract userDefined.images (array of {id, data} objects or bare strings)
    if (model.userDefined && Array.isArray(model.userDefined.images)) {
      const newUserImages = model.userDefined.images.map((entry, i) => {
        const dataUrl = typeof entry === 'string' ? entry : (entry && entry.data) || '';
        if (!dataUrl || !dataUrl.startsWith('data:')) {
          return entry; // already a file reference or no data
        }
        const id = (entry && typeof entry === 'object' && entry.id) || String(i);
        const ext = getImageExtension(dataUrl);
        const filename = getMediaFilename(modelHash, 'user', i, ext);
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(path.join(mediaDir, filename), Buffer.from(base64Data, 'base64'));
        changed = true;
        return { id, file: filename };
      });
      model.userDefined.images = newUserImages;
    }

    if (!changed) return { migrated: false, skipped: true, error: null };

    model.imageVersion = 2;

    const tmp = munchieJsonPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(model, null, 2), 'utf8');
    fs.renameSync(tmp, munchieJsonPath);

    return { migrated: true, skipped: false, error: null };
  } catch (e) {
    return { migrated: false, skipped: false, error: e.message };
  }
}

/**
 * For a model already at imageVersion: 2, extract any new user images that
 * still have inline base64 (data field) to .munchie_media/.
 * Used in save-model when new images are added after migration.
 * Mutates the userDefined.images array in-place.
 *
 * @param {object} model - the model object (already merged, about to be written)
 * @param {string} modelsRoot - absolute path to models root
 */
function extractNewUserImages(model, modelsRoot) {
  if (model.imageVersion !== 2) return;
  if (!model.userDefined || !Array.isArray(model.userDefined.images)) return;

  const mediaDir = ensureMediaDir(modelsRoot);
  const modelHash = model.hash || model.id || 'unknown';

  model.userDefined.images = model.userDefined.images.map((entry, i) => {
    const dataUrl = entry && typeof entry === 'object' ? (entry.data || '') : '';
    if (!dataUrl || !dataUrl.startsWith('data:')) return entry; // already a file or no base64

    const id = entry.id || String(i);
    const ext = getImageExtension(dataUrl);
    const filename = getMediaFilename(modelHash, 'user', i, ext);
    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(path.join(mediaDir, filename), Buffer.from(base64Data, 'base64'));
    return { id, file: filename };
  });
}

/**
 * Convert a v2 munchie.json model's image references (filenames) to
 * /api/media/ URLs so the frontend can render them without knowing about
 * imageVersion. Returns a new object — does not mutate the input.
 */
function translateV2ToUrls(model) {
  if (!model || model.imageVersion !== 2) return model;

  const translated = { ...model };

  if (Array.isArray(translated.parsedImages)) {
    translated.parsedImages = translated.parsedImages.map(f =>
      typeof f === 'string' && f && !f.startsWith('/') && !f.startsWith('data:')
        ? `/api/media/${encodeURIComponent(f)}`
        : f
    );
  }

  if (translated.userDefined && Array.isArray(translated.userDefined.images)) {
    translated.userDefined = {
      ...translated.userDefined,
      images: translated.userDefined.images.map(entry => {
        if (!entry || typeof entry !== 'object') return entry;
        if (!entry.file) return entry;
        return { ...entry, data: `/api/media/${encodeURIComponent(entry.file)}` };
      }),
    };
  }

  return translated;
}

module.exports = {
  getMediaDir,
  ensureMediaDir,
  getMediaFilename,
  getImageExtension,
  extractImages,
  extractNewUserImages,
  translateV2ToUrls,
};
