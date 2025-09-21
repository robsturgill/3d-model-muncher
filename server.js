// Simple Express server for 3D Model Muncher backend API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const multer = require('multer');
const { scanDirectory } = require('./dist-backend/utils/threeMFToJson');
const { ConfigManager } = require('./dist-backend/utils/configManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Helper: sanitize objects before logging to avoid dumping large base64 images
function sanitizeForLog(value, options = {}) {
  const maxStringLength = options.maxStringLength || 200; // truncate long strings
  const base64Pattern = /^(data:\w+\/[\w+.-]+;base64,)?[A-Za-z0-9+/=\s]{200,}$/; // heuristic

  function sanitize(v, seen = new Set()) {
    if (v == null) return v;
    if (typeof v === 'string') {
      // If looks like base64 or very long, truncate and replace
      const trimmed = v.trim();
      if (trimmed.length > maxStringLength || base64Pattern.test(trimmed)) {
        return trimmed.substring(0, 64) + '...[TRUNCATED ' + trimmed.length + ' chars]';
      }
      return v;
    }
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) {
      return v.map(i => sanitize(i, seen));
    }
    if (typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      const out = {};
      for (const k of Object.keys(v)) {
        // Skip very large keys that commonly contain image data
        if (/(thumbnail|image|data|base64)/i.test(k) && typeof v[k] === 'string') {
          const s = v[k].trim();
          if (s.length > 40 || base64Pattern.test(s)) {
            out[k] = '[BASE64 TRUNCATED ' + s.length + ' chars]';
            continue;
          }
        }
        out[k] = sanitize(v[k], seen);
      }
      return out;
    }
    return v;
  }

  try {
    return sanitize(value);
  } catch (e) {
    return '[Unable to sanitize]';
  }
}

function safeLog(...args) {
  const sanitized = args.map(a => {
    if (typeof a === 'object' && a !== null) return sanitizeForLog(a);
    if (typeof a === 'string' && a.length > 400) return a.substring(0, 200) + '...[TRUNCATED ' + a.length + ' chars]';
    return a;
  });
  console.log.apply(console, sanitized);
}

// Configure multer for backup file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.use(cors());
app.use(express.json({ limit: '25mb' })); // Increased limit for large model payloads

// Health check endpoint for Docker/Unraid
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0'
  });
});

// Serve model files from the models directory
const config = ConfigManager.loadConfig();
// Always serve from the source models directory for single source of truth
const modelDir = (config.settings && config.settings.modelDirectory) || './models';
const absoluteModelPath = path.isAbsolute(modelDir) ? modelDir : path.join(process.cwd(), modelDir);
console.log(`Serving models from: ${absoluteModelPath} (single source of truth)`);
app.use('/models', express.static(absoluteModelPath));

// Helper function to get the models directory (always from source)
function getModelsDirectory() {
  const config = ConfigManager.loadConfig();
  return (config.settings && config.settings.modelDirectory) || './models';
}

function getAbsoluteModelsPath() {
  const dir = getModelsDirectory();
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

// API endpoint to save a model to its munchie.json file
app.post('/api/save-model', (req, res) => {
  let { filePath, id, ...changes } = req.body || {};

  // Require at least an id or a filePath so we know where to save
  if (!filePath && !id) {
    return res.status(400).json({ success: false, error: 'No filePath or id provided' });
  }
  try {
    // If an id was provided without a filePath, try to locate the munchie JSON file by scanning the models directory
    let absoluteFilePath;
    if (!filePath && id) {
      try {
        const modelsRoot = getAbsoluteModelsPath();
        let found = null;
        function walk(dir) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (found) break;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
              try {
                const raw = fs.readFileSync(full, 'utf8');
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed && (parsed.id === id || parsed.name === id)) {
                  found = full;
                  break;
                }
              } catch (e) {
                // ignore parse errors for individual files
              }
            }
          }
        }
        walk(modelsRoot);
        if (!found) {
          return res.status(404).json({ success: false, error: 'Model id not found' });
        }
        absoluteFilePath = found;
        // populate filePath (relative) for logging and downstream use
        filePath = path.relative(modelsRoot, found).replace(/\\/g, '/');
      } catch (e) {
        console.error('Error searching for munchie by id:', e);
        return res.status(500).json({ success: false, error: 'Internal error locating model by id' });
      }
    } else {
      // Resolve provided filePath to absolute path
      if (path.isAbsolute(filePath)) {
        absoluteFilePath = filePath;
      } else {
        absoluteFilePath = path.join(absoluteModelPath, filePath);
      }
    }

    console.log('Resolved file path for saving:', absoluteFilePath);

    // Require relative filePath and ensure the target is inside the configured models directory
    if (path.isAbsolute(filePath) && !(filePath && filePath.startsWith('./') === false)) {
      // If the client sent an absolute filePath string, reject it outright for safety
      console.warn('Rejected absolute filePath in /api/save-model:', filePath);
      return res.status(400).json({ success: false, error: 'Absolute file paths are not allowed' });
    }

    try {
      const resolvedTarget = path.resolve(absoluteFilePath);
      const modelsDirResolved = path.resolve(getAbsoluteModelsPath());
      const relative = path.relative(modelsDirResolved, resolvedTarget);
      if (relative.startsWith('..') || (relative === '' && resolvedTarget !== modelsDirResolved)) {
        console.warn('Attempt to save model outside models directory blocked:', resolvedTarget, 'relativeToModelsDir=', relative);
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    } catch (e) {
      console.error('Error resolving paths for save-model containment check:', e);
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }
    
    // Load existing model JSON (be defensive against corrupt or partial files)
    let existing = {};
    if (fs.existsSync(absoluteFilePath)) {
      try {
        const raw = fs.readFileSync(absoluteFilePath, 'utf-8');
        existing = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        console.error(`Failed to parse existing model JSON at ${absoluteFilePath}:`, parseErr);
        // If file is corrupted or partially written, continue with an empty object so we can
        // overwrite with a clean, valid JSON. Do NOT hard-fail here to avoid blocking UI actions.
        existing = {};
      }
    }

    // Migration: if an existing file accidentally contains a top-level `changes` object
    // (caused by the previous API mismatch where the client sent { filePath, changes: {...} }),
    // merge that object into the top-level and remove the wrapper so the file doesn't
    // continue to contain a "changes" wrapper.
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && existing.changes && typeof existing.changes === 'object') {
      try {
        const migrated = { ...existing, ...existing.changes };
        delete migrated.changes;
        existing = migrated;
        console.log(`Migrated embedded 'changes' object for ${absoluteFilePath}`);
      } catch (e) {
        console.warn(`Failed to migrate embedded 'changes' for ${absoluteFilePath}:`, e);
      }
    }
    
    // Some clients send { filePath, changes: { ... } } while others send flattened top-level change fields.
    // Support both shapes: prefer req.body.changes when present, otherwise use the flattened rest.
    let incomingChanges = changes;
    if (req.body && req.body.changes && typeof req.body.changes === 'object') {
      incomingChanges = req.body.changes;
    }

    // Remove filePath and other computed properties from incomingChanges to prevent them from being saved
    const { filePath: _, modelUrl: __, ...cleanChanges } = incomingChanges;
    
    // Normalize tags if provided: trim and dedupe case-insensitively while preserving
    // the original casing of the first occurrence.
    function normalizeTags(tags) {
      if (!Array.isArray(tags)) return tags;
      const seen = new Set();
      const out = [];
      for (const t of tags) {
        if (typeof t !== 'string') continue;
        const trimmed = t.trim();
        const key = trimmed.toLowerCase();
        if (!seen.has(key) && trimmed !== '') {
          seen.add(key);
          out.push(trimmed);
        }
      }
      return out;
    }

    if (cleanChanges.tags) {
      cleanChanges.tags = normalizeTags(cleanChanges.tags);
    }

    function normalizeRelatedFiles(arr) {
      const cleaned = [];
      const rejected = [];
      if (!Array.isArray(arr)) return { cleaned, rejected };
      const seen = new Set();
      for (let raw of arr) {
        if (typeof raw !== 'string') continue;
        let s = raw.trim();
        if (s === '') {
          rejected.push(raw);
          continue; // drop empty entries
        }

        // Reject path traversal
        if (s.includes('..')) {
          rejected.push(raw);
          continue;
        }

        // Normalize backslashes to forward slashes for consistent URLs
        s = s.replace(/\\/g, '/');

        // Reject UNC paths (starting with //) for security reasons
        if (s.startsWith('//')) {
          rejected.push(raw);
          continue;
        }

        // Reject absolute Windows drive paths (e.g., C:/ or C:\) for security
        if (/^[a-zA-Z]:\//.test(s) || /^[a-zA-Z]:\\/.test(raw)) {
          // treat as rejected
          rejected.push(raw);
          continue;
        } else {
          // Strip a single leading slash if present to make it relative to /models when used
          if (s.startsWith('/')) s = s.substring(1);
          if (s.startsWith('/')) s = s.substring(1); // double-check
        }

        // Deduplicate by normalized form
        const key = s.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(s);
        } else {
          // duplicate silently dropped
        }
      }
      return { cleaned, rejected };
    }

    let rejectedRelatedFiles = [];
    if (cleanChanges.related_files) {
      const nf = normalizeRelatedFiles(cleanChanges.related_files);
      cleanChanges.related_files = nf.cleaned;
      rejectedRelatedFiles = nf.rejected;
    }

    // At this point we've computed the cleaned changes. Log a concise message:
    if (!cleanChanges || Object.keys(cleanChanges).length === 0) {
      safeLog('Save model request: No changes to apply for', { filePath });
      console.log('No changes to apply for', absoluteFilePath);
      return res.json({ success: true, message: 'No changes' });
    } else {
      // Only log the cleaned changes (no computed props) to avoid noisy or nested payloads
      safeLog('Save model request:', { filePath, changes: sanitizeForLog(cleanChanges) });
    }

  // Merge changes carefully. We specially merge `userDefined` arrays so that
    // we don't blindly overwrite existing user data (which could strip images
    // or imageOrder). The client is expected to write descriptors into
    // `userDefined[0].imageOrder` (no legacy top-level imageOrder support).
    const updated = { ...existing };
    for (const key of Object.keys(cleanChanges)) {
      if (key === 'userDefined') continue; // handle after loop
      updated[key] = cleanChanges[key];
    }

    if (Array.isArray(cleanChanges.userDefined)) {
      const existingUD = Array.isArray(existing.userDefined) ? existing.userDefined.slice() : [];
      const incomingUD = cleanChanges.userDefined.slice();
      const mergedUD = [];
      // Merge first entry shallowly (preserve existing fields unless overridden)
      const mergedFirst = { ...(existingUD[0] || {}), ...(incomingUD[0] || {}) };
      mergedUD.push(mergedFirst);
      // If incoming provided more entries, append them; otherwise preserve existing tail entries
      if (incomingUD.length > 1) {
        mergedUD.push(...incomingUD.slice(1));
      } else if (existingUD.length > 1) {
        mergedUD.push(...existingUD.slice(1));
      }
      updated.userDefined = mergedUD;
    }

    // Capture the original incoming nested thumbnail descriptor (if any).
    // We'll use this to avoid overwriting an explicit parsed:N descriptor
    // that the client intentionally sent.
    let incomingUdThumb = undefined;
    try {
      if (Array.isArray(cleanChanges.userDefined) && cleanChanges.userDefined.length > 0) {
        incomingUdThumb = cleanChanges.userDefined[0].thumbnail;
        console.log('DEBUG /api/save-model: incoming changes.userDefined[0].thumbnail =', incomingUdThumb);
      }
    } catch (e) {
      // don't let debug logging break save flow
    }

    // Detect whether the client explicitly included a thumbnail change.
    const hadThumbnailChange = incomingChanges && Object.prototype.hasOwnProperty.call(incomingChanges, 'thumbnail');

    // Determine whether the incoming payload actually included user images
    // in userDefined[0].images. If not, be conservative and do NOT create
    // userDefined[0].images from parser-produced top-level thumbnails.
    const incomingUserImagesProvided = Array.isArray(incomingChanges?.userDefined)
      && Array.isArray(incomingChanges.userDefined[0]?.images)
      && incomingChanges.userDefined[0].images.length > 0;

    // Safeguard: if the client cleared the top-level thumbnail (thumbnail: '')
    // but didn't actually provide any user images, ignore that clear request
    // to avoid promoting parsed thumbnails into userDefined images during
    // delete-only operations. The client usually intends to set a descriptor
    // (thumb:0) rather than move parsed data.
    if (hadThumbnailChange && incomingChanges && incomingChanges.thumbnail === '' && !incomingUserImagesProvided) {
      // remove the thumbnail clear so existing top-level thumbnail is preserved
      delete incomingChanges.thumbnail;
      delete cleanChanges.thumbnail;
      console.log('Ignored thumbnail clear from incoming changes because no user images were provided');
    }

    // Defensive normalization: canonicalize userDefined[0].thumbnail so it
    // stores descriptors (e.g., 'user:0' or 'parsed:1') instead of raw
    // base64 blobs or object forms. Also ensure we do not promote any
    // user-provided base64 into the top-level `thumbnail` field.
    try {
      if (Array.isArray(updated.userDefined) && updated.userDefined.length > 0) {
        const ud0 = updated.userDefined[0] || {};
        const imagesArr = Array.isArray(ud0.images) ? ud0.images.slice() : [];

        const getUserImageData = (entry) => {
          if (entry == null) return null;
          if (typeof entry === 'string') return entry;
          if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
          return null;
        };

        const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');

        // Prepare information about the original parsed/top-level images so
        // normalization logic can decide whether a data URL corresponds to a
        // parsed image (and therefore should not be promoted into userDefined).
        const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
        const existingImagesArr = Array.isArray(existing.images) ? existing.images : [];
        const existingParsedSet = new Set();
        if (existingTopThumb) existingParsedSet.add(existingTopThumb);
        for (const it of existingImagesArr) if (typeof it === 'string') existingParsedSet.add(it);

        // Normalize ud0.thumbnail
        if (typeof ud0.thumbnail !== 'undefined' && ud0.thumbnail !== null) {
          if (typeof ud0.thumbnail === 'object' && typeof ud0.thumbnail.data === 'string') {
            const data = ud0.thumbnail.data;
            if (incomingUserImagesProvided) {
              let idx = imagesArr.findIndex(u => getUserImageData(u) === data);
              if (idx === -1) {
                imagesArr.push(data);
                idx = imagesArr.length - 1;
              }
              ud0.thumbnail = `user:${idx}`;
            } else {
              // No user images provided: the object likely represents a parsed
              // thumbnail. If it equals the existing parsed thumbnail, treat as parsed.
              if (existingTopThumb && data === existingTopThumb) {
                ud0.thumbnail = 'thumb:0';
                updated.thumbnail = existingTopThumb;
              } else {
                // Otherwise, leave ud0.thumbnail alone but do not push into imagesArr.
                // This prevents accidental promotion of parsed data.
              }
            }
          } else if (typeof ud0.thumbnail === 'string') {
            const t = ud0.thumbnail;
            if (isDataUrl(t)) {
              if (incomingUserImagesProvided) {
                let idx = imagesArr.findIndex(u => getUserImageData(u) === t);
                if (idx === -1) {
                  imagesArr.push(t);
                  idx = imagesArr.length - 1;
                }
                ud0.thumbnail = `user:${idx}`;
              } else {
                if (existingParsedSet.has(t)) {
                  // If client explicitly sent a parsed data URL as the nested thumbnail
                  // in descriptor form (e.g., 'parsed:N'), preserve it rather than
                  // converting to 'thumb:0' which can mask the client's intent.
                  // Only set 'thumb:0' when we have no explicit parsed descriptor
                  // and we are restoring an existing parsed top-level thumbnail.
                  if (/^parsed:\d+$/.test(t)) {
                    // already a parsed descriptor; leave as-is
                  } else {
                    ud0.thumbnail = 'thumb:0';
                    // Prefer restoring top-level thumbnail if present; otherwise use
                    // the first parsed image found.
                    updated.thumbnail = existingTopThumb || (existingImagesArr.length > 0 ? existingImagesArr[0] : t);
                  }
                }
              }
            } else if (/^user:\d+$/.test(t) || /^parsed:\d+$/.test(t)) {
              // already a descriptor - leave as-is
            } else {
              // Non-data string: attempt to match it to an existing user image value
              const idx = imagesArr.findIndex(u => getUserImageData(u) === t);
              if (idx !== -1) ud0.thumbnail = `user:${idx}`;
              // otherwise assume it's a parsed/top-level value and leave it alone
            }
          }
        }

        // Only move a data URL into userDefined[0].images if it is a new user image,
        // i.e., not present in the original model's top-level thumbnail or images.
        if (typeof updated.thumbnail === 'string' && isDataUrl(updated.thumbnail)) {
          const udThumbStr = typeof ud0.thumbnail === 'string' ? ud0.thumbnail : undefined;
          const udThumbIsParsed = typeof udThumbStr === 'string' && /^parsed:\d+$/.test(udThumbStr);
          const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
          const topThumb = updated.thumbnail;
          const topThumbChanged = existingTopThumb !== topThumb;
          const isParsedImage = existingParsedSet.has(topThumb);

          if (!udThumbIsParsed && topThumbChanged && !isParsedImage && incomingUserImagesProvided) {
            // Only treat as user image if not present in original parsed images/thumbnail
            let matchIdx = imagesArr.findIndex(u => getUserImageData(u) === topThumb);
            if (matchIdx === -1) {
              imagesArr.push(topThumb);
              matchIdx = imagesArr.length - 1;
            }
            ud0.thumbnail = `user:${matchIdx}`;
            // clear top-level to avoid promotion
            updated.thumbnail = '';
          }
        }

        // Handle the case where the client explicitly cleared the top-level
        // thumbnail (sent thumbnail: '') but did not add any user images and
        // only updated the descriptor to indicate the thumbnail should now be
        // the first item (e.g., 'thumb:0'). In that case, restore the
        // existing parsed thumbnail so we don't move parser-produced base64
        // into userDefined.
          if (hadThumbnailChange && typeof updated.thumbnail === 'string' && updated.thumbnail === '') {
          const udThumbStr2 = typeof ud0.thumbnail === 'string' ? ud0.thumbnail : undefined;
          const udThumbIsThumbDescriptor = udThumbStr2 === 'thumb:0';
          const udHasUserImages = imagesArr.length > 0;
          if (udThumbIsThumbDescriptor && !udHasUserImages && existingTopThumb) {
            // restore the parsed thumbnail to top-level and keep the descriptor
            updated.thumbnail = existingTopThumb;
            // leave ud0.thumbnail as 'thumb:0' (client-intended descriptor)
          }
        }

        // Persist any changes back into updated.userDefined[0]
        ud0.images = imagesArr;
        updated.userDefined[0] = ud0;
      }
    } catch (e) {
      console.warn('Failed to normalize userDefined thumbnail during save:', e);
    }

    // Extra safety: ensure top-level thumbnail is not a descriptor token.
    // If somehow a descriptor string (thumb:, user:, parsed:) ended up at the
    // top-level thumbnail, convert it into an explicit nested descriptor on
    // userDefined[0].thumbnail and restore the original parsed thumbnail
    // when possible. This prevents descriptor tokens leaking into the 
    // canonical parsed thumbnail field on disk.
    try {
      const topThumb = updated && typeof updated.thumbnail === 'string' ? updated.thumbnail : undefined;
      if (topThumb && /^(thumb:|user:|parsed:)\d*$/.test(topThumb)) {
        // Move descriptor to userDefined[0].thumbnail
        if (!Array.isArray(updated.userDefined)) updated.userDefined = [{}];
        if (!updated.userDefined[0]) updated.userDefined[0] = {};
        // If the nested thumbnail already exists and differs, prefer preserving
        // the explicit nested value (don't overwrite unless it's empty).
        if (!updated.userDefined[0].thumbnail) {
          updated.userDefined[0].thumbnail = topThumb;
        }

        // Try to restore existing parsed thumbnail from the original file
        // if it was a parsed data URL. Otherwise clear top-level to avoid
        // storing descriptor tokens in that field.
        const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
        if (existingTopThumb && existingTopThumb.startsWith('data:')) {
          updated.thumbnail = existingTopThumb;
        } else {
          updated.thumbnail = '';
        }
      }
    } catch (e) {
      console.warn('Failed to guard top-level thumbnail descriptor token:', e);
    }

    // Prevent promoting a userDefined image into the top-level thumbnail.
    // If updated.thumbnail is a data URL that matches an entry in the
    // updated.userDefined[0].images array, convert it to a 'user:N' descriptor
    // and avoid writing the raw data into the top-level thumbnail field.
    try {
      const topThumbData = updated && typeof updated.thumbnail === 'string' && /^data:/i.test(updated.thumbnail) ? updated.thumbnail : undefined;
        if (topThumbData && Array.isArray(updated.userDefined) && updated.userDefined.length > 0) {
        const ud0 = updated.userDefined[0] || {};
        const udImages = Array.isArray(ud0.images) ? ud0.images : [];
        const matchIdx = udImages.findIndex(u => {
          const val = (typeof u === 'string') ? u : (u && u.data ? u.data : undefined);
          return val === topThumbData;
        });
        if (matchIdx !== -1) {
          // ensure nested descriptor points to the matching user image
          ud0.thumbnail = `user:${matchIdx}`;
          // restore existing parsed top-level thumbnail only if it is NOT
          // identical to a userDefined image (we must never leave a user
          // data URL in the canonical top-level thumbnail field).
          const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
          const existingUDImages = Array.isArray(udImages) ? udImages : [];
          const existingTopThumbIsSafeToRestore = existingTopThumb
            && existingTopThumb.startsWith('data:')
            && !existingUDImages.find(u => ((typeof u === 'string') ? u : (u && u.data ? u.data : undefined)) === existingTopThumb);
          if (existingTopThumbIsSafeToRestore) {
            updated.thumbnail = existingTopThumb;
          } else {
            updated.thumbnail = '';
          }
          updated.userDefined[0] = ud0;
        }
      }
    } catch (e) {
      console.warn('Failed to convert user-defined image to nested descriptor:', e);
    }

    // Post-normalization correction: if the client submitted a user descriptor
    // (e.g. 'user:0') that references data identical to the original parsed
    // top-level thumbnail, that likely indicates the client intended a
    // 'thumb:0' descriptor (parsed) rather than moving the parsed image into
    // userDefined. Convert such cases back to 'thumb:0' and restore top-level
    // thumbnail so parsed thumbnails are never promoted into userDefined.
    try {
      if (Array.isArray(updated.userDefined) && updated.userDefined.length > 0) {
        const ud0 = updated.userDefined[0] || {};
        if (typeof ud0.thumbnail === 'string' && /^user:\d+$/.test(ud0.thumbnail)) {
          const match = ud0.thumbnail.match(/^user:(\d+)$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            const udImages = Array.isArray(ud0.images) ? ud0.images : [];
            const referenced = udImages[idx] !== undefined ? (typeof udImages[idx] === 'string' ? udImages[idx] : (udImages[idx] && udImages[idx].data ? udImages[idx].data : undefined)) : undefined;
            const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
            const existingImagesArr = Array.isArray(existing && existing.images) ? existing.images : [];
            // If the referenced user image equals the original parsed top-level
            // thumbnail OR is present in the original parsed images, convert.
            if (referenced && existingTopThumb && referenced === existingTopThumb) {
              // If the client explicitly requested a parsed descriptor (parsed:N),
              // preserve that intent rather than converting to 'thumb:0'. Only
              // convert when the client didn't explicitly ask for parsed:N.
              const incomingWasParsed = typeof incomingUdThumb === 'string' && /^parsed:\d+$/.test(incomingUdThumb);
              if (!incomingWasParsed) {
                // Convert to parsed thumb descriptor and restore top-level thumbnail
                ud0.thumbnail = 'thumb:0';
                updated.thumbnail = existingTopThumb;
              } else {
                // Preserve the explicit parsed descriptor the client sent.
                ud0.thumbnail = incomingUdThumb;
                // Also ensure the top-level thumbnail is set to the parsed data
                updated.thumbnail = existingTopThumb;
              }
              // Remove the duplicated parsed data from ud0.images if it was
              // appended by this save (i.e., not present in the original
              // userDefined images).
              const existingUD0 = Array.isArray(existing.userDefined) && existing.userDefined.length > 0 ? existing.userDefined[0] : undefined;
              const existingUDImages = existingUD0 && Array.isArray(existingUD0.images) ? existingUD0.images : [];
              const refIndexInExistingUD = existingUDImages.findIndex(u => (typeof u === 'string' ? u : (u && u.data ? u.data : undefined)) === referenced);
              if (refIndexInExistingUD === -1) {
                // Remove the newly appended duplicate
                ud0.images = udImages.filter((_, i) => i !== idx);
                updated.userDefined[0] = ud0;
              }
                console.log('DEBUG /api/save-model: forced ud0.thumbnail -> thumb:0 due to referenced === existingTopThumb; idx=', idx);
            } else if (referenced && existingImagesArr.includes(referenced)) {
              // referenced matches one of the parsed images (not topThumb exactly)
              // In that case we also treat it as parsed and set thumb:0
              ud0.thumbnail = 'thumb:0';
                console.log('DEBUG /api/save-model: forced ud0.thumbnail -> thumb:0 because referenced exists in original parsed images; referenced=', referenced);
              updated.thumbnail = existingTopThumb || referenced;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed post-normalization correction for userDefined thumbnail:', e);
    }

    // Ensure the directory exists
    const dir = path.dirname(absoluteFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Final safety guard: ensure top-level thumbnail is not a descriptor token
    try {
      const finalTop = updated && typeof updated.thumbnail === 'string' ? updated.thumbnail : undefined;
      if (finalTop && /^(thumb:|user:|parsed:)\d*$/.test(finalTop)) {
        if (!Array.isArray(updated.userDefined)) updated.userDefined = [{}];
        if (!updated.userDefined[0]) updated.userDefined[0] = {};
        if (!updated.userDefined[0].thumbnail) updated.userDefined[0].thumbnail = finalTop;
        const existingTopThumb = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
        if (existingTopThumb && existingTopThumb.startsWith('data:')) {
          updated.thumbnail = existingTopThumb;
        } else {
          updated.thumbnail = '';
        }
      }
    } catch (e) {
      console.warn('Final guard for top-level thumbnail failed:', e);
    }

    // Enforce invariant: top-level `thumbnail` must only ever contain parsed
    // data (created by parsing 3MF files). Client saves MUST NOT write user
    // images or descriptor tokens into the top-level thumbnail field. To be
    // conservative we restore the original parsed thumbnail from `existing`
    // (if any) or clear the field. This prevents any promotion of
    // userDefined images into the canonical top-level thumbnail.
    try {
      const existingTopThumbFinal = existing && typeof existing.thumbnail === 'string' ? existing.thumbnail : undefined;
      if (existingTopThumbFinal && existingTopThumbFinal.startsWith('data:')) {
        // preserve only the original parsed thumbnail
        updated.thumbnail = existingTopThumbFinal;
      } else {
        // ensure we never write new data URLs or descriptor strings
        updated.thumbnail = '';
      }
    } catch (e) {
      console.warn('Failed enforcing top-level thumbnail invariant:', e);
      // If enforcement fails, clear the field to be safe
      updated.thumbnail = '';
    }

    // Final preservation: if userDefined[0].thumbnail is an explicit parsed:N
    // descriptor, ensure we persist that intent by setting the top-level
    // thumbnail to the corresponding parsed image data (from updated.images
    // or existing.images). This prevents earlier normalization from reverting
    // an explicit parsed descriptor back to 'thumb:0'.
    try {
      if (Array.isArray(updated.userDefined) && updated.userDefined.length > 0) {
        const ud0Thumb = updated.userDefined[0].thumbnail;
        if (typeof ud0Thumb === 'string' && /^parsed:\d+$/.test(ud0Thumb)) {
          const pidx = parseInt(ud0Thumb.split(':')[1] || '', 10);
          const parsedArr = Array.isArray(updated.images) ? updated.images : (Array.isArray(existing.images) ? existing.images : []);
          if (!isNaN(pidx) && parsedArr[pidx]) {
            updated.thumbnail = parsedArr[pidx];
            console.log('DEBUG /api/save-model: preserving parsed descriptor', ud0Thumb, '-> setting top-level thumbnail to parsed data');
          }
        }
      }
    } catch (e) {
      // ignore preservation failures
    }

    // Write atomically: write to a temp file then rename it into place to avoid
    // readers seeing a truncated/partial file during concurrent writes.
    const tmpPath = absoluteFilePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), 'utf8');
    fs.renameSync(tmpPath, absoluteFilePath);
    console.log('Model updated and saved to:', absoluteFilePath);
    // Return cleaned and rejected related_files for client feedback
    res.json({ success: true, cleaned_related_files: cleanChanges.related_files || [], rejected_related_files: rejectedRelatedFiles });
  } catch (err) {
    console.error('Error saving model:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to get all model data
app.get('/api/models', async (req, res) => {
  try {
    const absolutePath = getAbsoluteModelsPath();
  console.log(`API /models scanning directory: ${absolutePath}`);
    
    let models = [];
    
    // Function to recursively scan directories
    function scanForModels(directory) {
      console.log(`Scanning directory: ${directory}`);
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      console.log(`Found ${entries.length} entries in ${directory}`);
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          console.log(`Scanning subdirectory: ${fullPath}`);
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          // Load and parse each munchie file
          console.log(`Found munchie file: ${fullPath}`);
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            // Add relative path information for proper URL construction
            const relativePath = path.relative(absolutePath, fullPath);
            
            // Handle both 3MF and STL file types
            let modelUrl, filePath;
            if (entry.name.endsWith('-stl-munchie.json')) {
              // STL file - check if corresponding .stl file exists
              // Only process files with proper naming format: [name]-stl-munchie.json
              const fileName = entry.name;
              
              // Skip files with malformed names (e.g., containing duplicate suffixes)
              if (fileName.includes('-stl-munchie.json_')) {
                console.log(`Skipping malformed STL JSON file: ${fullPath}`);
              } else {
                const baseFilePath = relativePath.replace('-stl-munchie.json', '');
                // Try both .stl and .STL extensions
                let stlFilePath = baseFilePath + '.stl';
                let absoluteStlPath = path.join(absolutePath, stlFilePath);
                
                if (!fs.existsSync(absoluteStlPath)) {
                  // Try uppercase extension
                  stlFilePath = baseFilePath + '.STL';
                  absoluteStlPath = path.join(absolutePath, stlFilePath);
                }
                
                if (fs.existsSync(absoluteStlPath)) {
                  modelUrl = '/models/' + stlFilePath.replace(/\\/g, '/');
                  filePath = stlFilePath;
                  
                  model.modelUrl = modelUrl;
                  model.filePath = filePath;
                  
                    console.log(`Added STL model: ${model.name} with URL: ${model.modelUrl} and filePath: ${model.filePath}`);
                  models.push(model);
                } else {
                  console.log(`Skipping ${fullPath} - corresponding .stl/.STL file not found`);
                }
              }
            } else {
              // 3MF file - check if corresponding .3mf file exists
              // Only process files with proper naming format: [name]-munchie.json
              const fileName = entry.name;
              
              // Skip files with malformed names
              if (fileName.includes('-munchie.json_')) {
                console.log(`Skipping malformed 3MF JSON file: ${fullPath}`);
              } else {
                const threeMfFilePath = relativePath.replace('-munchie.json', '.3mf');
                const absoluteThreeMfPath = path.join(absolutePath, threeMfFilePath);
                
                if (fs.existsSync(absoluteThreeMfPath)) {
                  modelUrl = '/models/' + threeMfFilePath.replace(/\\/g, '/');
                  filePath = threeMfFilePath;
                  
                  model.modelUrl = modelUrl;
                  model.filePath = filePath;
                  
                  console.log(`Added 3MF model: ${model.name} with URL: ${model.modelUrl} and filePath: ${model.filePath}`);
                  models.push(model);
                } else {
                  console.log(`Skipping ${fullPath} - corresponding .3mf file not found at ${absoluteThreeMfPath}`);
                }
              }
            }
          } catch (error) {
                console.error(`Error reading model file ${fullPath}:`, error);
          }
        }
      }
    }
    
    // Start the recursive scan
    scanForModels(absolutePath);
    
    res.json(models);
  } catch (error) {
    console.error('Error loading models:', error);
    res.status(500).json({ success: false, message: 'Failed to load models', error: error.message });
  }
});

// API endpoint to trigger model directory scan and JSON generation
app.post('/api/scan-models', async (req, res) => {
  try {
    const { fileType = "3mf" } = req.body; // "3mf" or "stl" only
    const dir = getModelsDirectory();
    const result = await scanDirectory(dir, fileType);
    res.json({ 
      success: true, 
      message: 'Model JSON files generated successfully.',
      processed: result.processed,
      skipped: result.skipped
    });
  } catch (error) {
    console.error('Model JSON generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate model JSON files.', error: error.message });
  }
});

// API endpoint to save app configuration to data/config.json
app.post('/api/save-config', (req, res) => {
  try {
    const config = req.body;
    console.log('[server] POST /api/save-config called, incoming lastModified=', config && config.lastModified);
    if (!config) {
      return res.status(400).json({ success: false, error: 'No configuration provided' });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const configPath = path.join(dataDir, 'config.json');
    // Ensure lastModified is updated on server-side save
    const finalConfig = { ...config, lastModified: new Date().toISOString() };
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), 'utf8');
    console.log('[server] Saved configuration to', configPath, 'server lastModified=', finalConfig.lastModified);
    res.json({ success: true, path: configPath, config: finalConfig });
  } catch (err) {
    console.error('Failed to save config to data/config.json:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to load config.json from the data directory
app.get('/api/load-config', (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ success: false, error: 'No server-side config found' });
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    console.log('[server] GET /api/load-config served, server lastModified=', parsed.lastModified);
    res.json({ success: true, config: parsed });
  } catch (err) {
    console.error('Failed to load config from data/config.json:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to regenerate munchie files for specific models
app.post('/api/regenerate-munchie-files', async (req, res) => {
  try {
    const { modelIds } = req.body;
    
    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No model IDs provided' });
    }

    const modelsDir = getAbsoluteModelsPath();
    const { parse3MF, parseSTL, computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    let processed = 0;
    let errors = [];

    // Get all models to find the ones we need to regenerate
    let allModels = [];
    
    function scanForModels(directory) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            const relativePath = path.relative(modelsDir, fullPath);
            
            // Set the correct filePath based on model type
            if (entry.name.endsWith('-stl-munchie.json')) {
              model.filePath = relativePath.replace('-stl-munchie.json', '.stl');
              model.jsonPath = fullPath;
            } else {
              model.filePath = relativePath.replace('-munchie.json', '.3mf');
              model.jsonPath = fullPath;
            }
            
            allModels.push(model);
          } catch (error) {
            console.error(`Error reading model file ${fullPath}:`, error);
          }
        }
      }
    }
    
    scanForModels(modelsDir);

    for (const modelId of modelIds) {
      const model = allModels.find(m => m.id === modelId);
      
      if (!model) {
        errors.push({ modelId, error: 'Model not found' });
        continue;
      }

      try {
        // Get the actual model file path
        const modelFilePath = path.join(modelsDir, model.filePath);
        
        if (!fs.existsSync(modelFilePath)) {
          errors.push({ modelId, error: 'Model file not found' });
          continue;
        }

        // Backup user data before regenerating
        const currentData = JSON.parse(fs.readFileSync(model.jsonPath, 'utf8'));
        const userDataBackup = {
          tags: currentData.tags || [],
          isPrinted: currentData.isPrinted || false,
          printTime: currentData.printTime || "",
          filamentUsed: currentData.filamentUsed || "",
          category: currentData.category || "",
          notes: currentData.notes || "",
          license: currentData.license || "",
          hidden: currentData.hidden || false,
          source: currentData.source || "",
          price: currentData.price || 0,
          // Preserve user-managed related files and any structured user data (images, descriptions)
          related_files: Array.isArray(currentData.related_files) ? currentData.related_files : [],
          userDefined: Array.isArray(currentData.userDefined) ? currentData.userDefined : []
        };

        // Generate new metadata
        let newMetadata;
        const buffer = fs.readFileSync(modelFilePath);
        const hash = computeMD5(buffer);
        
        if (model.filePath.toLowerCase().endsWith('.3mf')) {
          newMetadata = await parse3MF(modelFilePath, model.id, hash);
        } else if (model.filePath.toLowerCase().endsWith('.stl')) {
          newMetadata = await parseSTL(modelFilePath, model.id, hash);
        } else {
          errors.push({ modelId, error: 'Unsupported file type' });
          continue;
        }

        // Merge with user data
        const mergedMetadata = {
          ...newMetadata,
          ...userDataBackup,
          id: model.id, // Preserve the original ID
          hash: hash
        };

        // Helper: extract user image data whether stored as legacy string or {id,data} object
        const getUserImageData = (entry) => {
          if (!entry) return '';
          if (typeof entry === 'string') return entry;
          if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
          return '';
        };

        // If userDefined[0].imageOrder exists (or even if not), rebuild the
        // descriptor list so it aligns with the regenerated top-level images
        // and the current userDefined images. This prevents parsed: indexes
        // from pointing to stale positions after regeneration.
        try {
          const parsed = Array.isArray(mergedMetadata.images) ? mergedMetadata.images : [];
          const userArr = Array.isArray((mergedMetadata).userDefined?.[0]?.images) ? mergedMetadata.userDefined[0].images : [];
          const combined = [mergedMetadata.thumbnail].concat(parsed).concat(userArr.map(u => getUserImageData(u)));
          const rebuiltOrder = [];
          for (const item of combined) {
            if (item === mergedMetadata.thumbnail && mergedMetadata.thumbnail) {
              rebuiltOrder.push('thumb:0');
              continue;
            }
            const pidx = parsed.indexOf(item);
            if (pidx !== -1) {
              rebuiltOrder.push(`parsed:${pidx}`);
              continue;
            }
            const uidx = userArr.findIndex(u => getUserImageData(u) === item);
            if (uidx !== -1) {
              rebuiltOrder.push(`user:${uidx}`);
              continue;
            }
            // fallback to literal
            rebuiltOrder.push(String(item));
          }
          // Ensure userDefined array exists and set the rebuilt order
          if (!Array.isArray(mergedMetadata.userDefined) || mergedMetadata.userDefined.length === 0) mergedMetadata.userDefined = [{}];
          mergedMetadata.userDefined[0] = { ...(mergedMetadata.userDefined[0] || {}), imageOrder: rebuiltOrder };
        } catch (e) {
          console.warn('Failed to rebuild userDefined[0].imageOrder during regeneration:', e);
        }

        // Write the regenerated file
        fs.writeFileSync(model.jsonPath, JSON.stringify(mergedMetadata, null, 2), 'utf8');
        processed++;
        
        console.log(`Regenerated munchie file for model: ${model.name}`);
        
      } catch (error) {
        console.error(`Error regenerating munchie file for model ${modelId}:`, error);
        errors.push({ modelId, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      processed,
      errors,
      message: `Regenerated ${processed} munchie files${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Munchie file regeneration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to regenerate munchie files.', 
      error: error.message 
    });
  }
});

// --- API: Get all -munchie.json files and their hashes ---
app.get('/api/munchie-files', (req, res) => {
  const modelsDir = getAbsoluteModelsPath();
  let result = [];
  
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.name.toLowerCase().endsWith('-munchie.json')) {
          try {
            const data = fs.readFileSync(fullPath, 'utf8');
            const json = JSON.parse(data);
            // Get path relative to models directory for the URL
            const relativePath = path.relative(modelsDir, fullPath);
            result.push({
              fileName: entry.name,
              hash: json.hash,
              modelUrl: '/models/' + relativePath.replace(/\\/g, '/')
            });
          } catch (e) {
            // skip unreadable or invalid files
            console.error(`Error reading file ${fullPath}:`, e);
          }
        }
      }
    } catch (e) {
      console.error(`Error scanning directory ${dir}:`, e);
    }
  }

  try {
    scanDirectory(modelsDir);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read models directory' });
  }
});

// --- API: Hash check for all .3mf files and their -munchie.json ---
app.post('/api/hash-check', async (req, res) => {
  try {
    const { fileType = "3mf" } = req.body; // "3mf" or "stl" only
    const modelsDir = getAbsoluteModelsPath();
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    let result = [];
    let seenHashes = new Set();
    let hashToFiles = {};
    let errors = [];
    let modelMap = {};

    // Recursively scan directories
    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const relativePath = path.relative(modelsDir, fullPath);
          
          if (fileType === "3mf") {
            // Only process 3MF files and their JSON companions
            if (relativePath.toLowerCase().endsWith('.3mf')) {
              const base = relativePath.replace(/\.3mf$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].threeMF = relativePath;
            } else if (relativePath.toLowerCase().endsWith('-munchie.json')) {
              const base = relativePath.replace(/-munchie\.json$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].json = relativePath;
            }
          } else if (fileType === "stl") {
            // Only process STL files and their JSON companions
            if (relativePath.toLowerCase().endsWith('.stl')) {
              const base = relativePath.replace(/\.stl$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].stl = relativePath;
            } else if (relativePath.toLowerCase().endsWith('-stl-munchie.json')) {
              const base = relativePath.replace(/-stl-munchie\.json$/i, '');
              modelMap[base] = modelMap[base] || {};
              modelMap[base].json = relativePath;
            }
          }
        }
      }
    }

    // Start recursive scan
    scanDirectory(modelsDir);

    // Clean up the modelMap to only include entries that have the expected file type
    const cleanedModelMap = {};
    for (const base in modelMap) {
      const entry = modelMap[base];
      if (fileType === "3mf" && entry.threeMF) {
        // Only include 3MF entries when in 3MF mode
        cleanedModelMap[base] = entry;
      } else if (fileType === "stl" && entry.stl) {
        // Only include STL entries when in STL mode
        cleanedModelMap[base] = entry;
      }
    }

    // Process all found models
    for (const base in cleanedModelMap) {
      const entry = cleanedModelMap[base];
      const threeMFPath = entry.threeMF ? path.join(modelsDir, entry.threeMF) : null;
      const stlPath = entry.stl ? path.join(modelsDir, entry.stl) : null;
      const jsonPath = entry.json ? path.join(modelsDir, entry.json) : null;
      const modelPath = threeMFPath || stlPath; // Prefer 3MF, but use STL if no 3MF
      let status = 'ok';
      let details = '';
      let hash = null;
      let storedHash = null;

      if (!modelPath) {
        status = 'missing-model';
        const fileExtension = fileType === "3mf" ? ".3mf" : ".stl";
        details = `Missing ${fileExtension} file`;
      } else if (!jsonPath) {
        status = 'missing-json';
        details = 'Missing -munchie.json file';
        } else {
          try {
            hash = computeMD5(modelPath);
            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
            if (jsonContent.trim().length === 0) {
              status = 'empty-json';
              details = 'Empty JSON file';
            } else {
              const json = JSON.parse(jsonContent);
              storedHash = json.hash;
              if (!storedHash) {
                status = 'missing-hash';
                details = 'No hash in JSON';
              } else if (hash !== storedHash) {
                status = 'hash-mismatch';
                details = `Hash mismatch: model=${hash}, json=${storedHash}`;
              }
            }
          } catch (e) {
            status = 'error';
            details = e.message;
          }
        }
        
        // Store hash for duplicate checking (but don't change status for duplicates)
        if (hash) {
          if (hashToFiles[hash]) {
            hashToFiles[hash].push(base);
          } else {
            hashToFiles[hash] = [base];
          }
        }

      result.push({
        baseName: base,
        threeMF: entry.threeMF || null,
        stl: entry.stl || null,
        json: entry.json || null,
        hash,
        storedHash,
        status,
        details
      });
    }

    // Add info about which files share duplicate hashes
    result.forEach(r => {
      if (r.hash && hashToFiles[r.hash] && hashToFiles[r.hash].length > 1) {
        r.duplicates = hashToFiles[r.hash].filter(b => b !== r.baseName);
      }
    });

    res.json({ success: true, results: result });
  } catch (e) {
    console.error('Hash check error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// API endpoint to load a model from a munchie.json file
app.get('/api/load-model', async (req, res) => {
  try {
    const { filePath, id } = req.query;
    // Prefer id-based lookup when provided (more robust)
    const modelsDir = path.resolve(getModelsDirectory());

    // If `id` provided, try scanning for a munchie.json with matching id
    if (id && typeof id === 'string' && id.trim().length > 0) {
      safeLog('Load model by id requested', { id });
      // Recursively search munchie files for matching id
      function findById(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const r = findById(full);
            if (r) return r;
          } else if (entry.name.toLowerCase().endsWith('-munchie.json') || entry.name.toLowerCase().endsWith('-stl-munchie.json')) {
            try {
              const raw = fs.readFileSync(full, 'utf8');
              if (!raw || raw.trim().length === 0) continue;
              const parsed = JSON.parse(raw);
              if (parsed && (parsed.id === id || parsed.name === id)) {
                return full;
              }
            } catch (e) {
              // ignore parse/read errors
            }
          }
        }
        return null;
      }

      try {
        const found = findById(modelsDir);
        if (found) {
          const content = fs.readFileSync(found, 'utf8');
          const parsed = JSON.parse(content);
          return res.json(parsed);
        }
        // If search completed without finding a match, return 404 to indicate not found
        return res.status(404).json({ success: false, error: 'Model not found for id' });
      } catch (e) {
        console.error('Error during id lookup for /api/load-model (falling back to filePath):', e);
        // On unexpected errors, fall through to filePath handling below
      }
    }

    console.log('Load model request for filePath:', filePath, 'id:', id);

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file path' });
    }

    // If filePath is absolute, resolve it directly. If relative, treat it as relative to the models directory
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = path.resolve(filePath);
    } else {
      // Normalize incoming slashes and strip leading slash if present
      let rel = filePath.replace(/\\/g, '/').replace(/^\//, '');
      // Prevent traversal attempts
      if (rel.includes('..')) return res.status(400).json({ success: false, error: 'Invalid relative path' });
      fullPath = path.join(modelsDir, rel);
    }
    safeLog('Resolved path for /api/load-model', { resolved: fullPath });

    // Ensure the path is within the models directory for security
    const resolvedModelsDir = modelsDir.endsWith(path.sep) ? modelsDir : modelsDir + path.sep;
    const resolvedFull = fullPath;
    if (!resolvedFull.startsWith(modelsDir) && !resolvedFull.startsWith(resolvedModelsDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Validate that we're only loading JSON files
    if (!fullPath.toLowerCase().endsWith('.json')) {
      console.log('Attempt to load non-JSON file as model data:', fullPath);
      return res.status(400).json({ success: false, error: 'Only JSON files can be loaded as model data' });
    }

    // Read the file content first to check if it's valid
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    if (fileContent.trim().length === 0) {
      console.log('Empty file detected:', fullPath);
      return res.status(400).json({ success: false, error: 'Empty file' });
    }

    // Read and parse the JSON file
    const modelData = JSON.parse(fileContent);
    res.json(modelData);
  } catch (error) {
    console.error('Error loading model:', error);
    res.status(500).json({ success: false, error: 'Failed to load model data' });
  }
});

app.post('/api/delete-models', (req, res) => {
  const { files } = req.body; // array of file paths relative to models dir
  if (!Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'No files provided' });
  }
  const modelsDir = getAbsoluteModelsPath();
  let deleted = [];
  let errors = [];
  files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted.push(file);
      }
    } catch (err) {
      errors.push({ file, error: err.message });
    }
  });
  res.json({ success: errors.length === 0, deleted, errors });
});

// API endpoint to verify a related file path (used by frontend Verify button)
app.post('/api/verify-file', (req, res) => {
  try {
    const { path: incomingPath } = req.body || {};
    if (!incomingPath || typeof incomingPath !== 'string') {
      return res.status(400).json({ success: false, error: 'Path required' });
    }

    // Basic normalization similar to other server helpers
    let s = incomingPath.trim();
    if (s === '') return res.status(400).json({ success: false, error: 'Empty path' });
    // Strip quotes
    if (/^['"].*['"]$/.test(s)) s = s.replace(/^['"]|['"]$/g, '').trim();
    // Reject traversal
    if (s.includes('..')) return res.status(400).json({ success: false, error: 'Path traversal not allowed' });
    // Normalize slashes
    s = s.replace(/\\/g, '/');
    // Reject UNC
    if (s.startsWith('//')) return res.status(400).json({ success: false, error: 'UNC paths not allowed' });
    // Reject Windows drive-letter absolutes
    if (/^[a-zA-Z]:\//.test(s) || /^[a-zA-Z]:\\/.test(incomingPath)) return res.status(400).json({ success: false, error: 'Absolute Windows paths not allowed' });
    // Strip leading slash to make relative
    if (s.startsWith('/')) s = s.substring(1);

    const modelsDir = getAbsoluteModelsPath();
    const candidate = path.join(modelsDir, s);
    // Ensure candidate path is within models dir
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(modelsDir))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!fs.existsSync(resolved)) {
      return res.json({ success: true, exists: false, path: s });
    }

    const stat = fs.statSync(resolved);
    return res.json({ success: true, exists: true, isFile: stat.isFile(), isDirectory: stat.isDirectory(), size: stat.size, path: s });
  } catch (err) {
    console.error('verify-file error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to validate a specific 3MF file
app.get('/api/validate-3mf', async (req, res) => {
  const { file } = req.query;
  
  if (!file) {
    return res.status(400).json({ error: 'File path required' });
  }

  try {
    const { parse3MF } = require('./dist-backend/utils/threeMFToJson');
    const filePath = path.isAbsolute(file) ? file : path.join(absoluteModelPath, file);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Try to parse the 3MF file
    const metadata = await parse3MF(filePath, 0);
    
    res.json({ 
      valid: true, 
      file: file,
      size: fs.statSync(filePath).size,
      metadata: {
        name: metadata.name,
        thumbnail: metadata.thumbnail ? 'present' : 'missing',
        fileSize: metadata.fileSize
      }
    });
  } catch (error) {
    console.error('3MF validation error:', error.message);
    res.json({ 
      valid: false, 
      file: file,
      error: error.message,
      suggestion: error.message.includes('rels') || error.message.includes('relationship') 
        ? 'This 3MF file appears to be missing relationship files. Try re-exporting from your 3D software.'
        : 'This 3MF file may be corrupted or in an unsupported format.'
    });
  }
});

// Helper function to get all models
async function getAllModels(modelsDirectory) {
  const absolutePath = modelsDirectory;
  let models = [];
  
  // Function to recursively scan directories
  function scanForModels(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanForModels(fullPath);
      } else if (entry.name.endsWith('-munchie.json')) {
        // Load and parse each munchie file
        try {
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          const model = JSON.parse(fileContent);
          // Add relative path information for proper URL construction
          const relativePath = path.relative(absolutePath, fullPath);
          model.modelUrl = '/models/' + relativePath.replace(/\\/g, '/').replace('-munchie.json', '.3mf');
          
          // Set the filePath property for deletion purposes
          model.filePath = relativePath.replace('-munchie.json', '.3mf');
          
          models.push(model);
        } catch (error) {
          console.error(`Error reading model file ${fullPath}:`, error);
        }
      }
    }
  }
  
  if (fs.existsSync(absolutePath)) {
    scanForModels(absolutePath);
  }
  
  return models;
}

// API endpoint: Gemini suggestion (provider-backed with mock fallback)
app.post('/api/gemini-suggest', async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // imageBase64 is optional; validate shape if provided
    if (imageBase64 && typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'imageBase64 must be a base64 string' });
    }

    const requestedProvider = (req.body && req.body.provider) || process.env.GEMINI_PROVIDER;
    safeLog('Received /api/gemini-suggest request', { prompt, mimeType, provider: requestedProvider });

    // Try provider adapter (pass requested provider)
    let genaiResult = null;
    try {
      const adapter = require('./server-utils/genaiAdapter');
      genaiResult = await adapter.suggest({ prompt, imageBase64, mimeType, provider: requestedProvider });
    } catch (e) {
      console.warn('GenAI adapter error or not configured:', e && e.message);
      genaiResult = null;
    }

    if (genaiResult) {
      // Normalize result
      const suggestion = {
        description: genaiResult.description || '',
        category: genaiResult.category || '',
        tags: Array.isArray(genaiResult.tags) ? genaiResult.tags : []
      };
      return res.json({ success: true, suggestion, raw: genaiResult.raw || null });
    }

    // Fallback mock behavior (previous heuristic)
    const lower = prompt.toLowerCase();
    const words = Array.from(new Set(lower.replace(/[\W_]+/g, ' ').split(/\s+/).filter(w => w.length > 3)));
    const tags = words.slice(0, 6);
    const description = `AI suggestion (mock) based on prompt: ${prompt}`;
    const category = tags.length ? tags[0] : '';

    const suggestion = {
      description,
      category,
      tags
    };

    return res.json({ success: true, suggestion, raw: null });
  } catch (err) {
    console.error('/api/gemini-suggest error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// API endpoint to delete models by ID (deletes specified file types)
app.delete('/api/models/delete', async (req, res) => {
  const { modelIds, fileTypes } = req.body;
  
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No model IDs provided' });
  }

  // Default to deleting both file types if not specified (backward compatibility)
  const typesToDelete = Array.isArray(fileTypes) && fileTypes.length > 0 ? fileTypes : ['3mf', 'json'];
  console.log(`File types to delete: ${typesToDelete.join(', ')}`);

  try {
    const modelsDir = getAbsoluteModelsPath();
    let deleted = [];
    let errors = [];

    // Scan for all models (both 3MF and STL) using the same logic as the main API
    let allModels = [];
    
    function scanForModels(directory) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          scanForModels(fullPath);
        } else if (entry.name.endsWith('-munchie.json') || entry.name.endsWith('-stl-munchie.json')) {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            const relativePath = path.relative(modelsDir, fullPath);
            
            // Set the correct filePath based on model type
            if (entry.name.endsWith('-stl-munchie.json')) {
              // STL model
              model.filePath = relativePath.replace('-stl-munchie.json', '.stl');
            } else {
              // 3MF model
              model.filePath = relativePath.replace('-munchie.json', '.3mf');
            }
            
            allModels.push(model);
          } catch (error) {
            console.error(`Error reading model file ${fullPath}:`, error);
          }
        }
      }
    }
    
    scanForModels(modelsDir);
    
    for (const modelId of modelIds) {
      const model = allModels.find(m => m.id === modelId);
      console.log(`Processing model ID: ${modelId}`);
      
      if (!model) {
        console.log(`Model not found for ID: ${modelId}`);
        errors.push({ modelId, error: 'Model not found' });
        continue;
      }

      console.log(`Found model: ${model.name}, filePath: ${model.filePath}`);

      const filesToDelete = [];
      
      // Check if model has a valid filePath
      if (!model.filePath) {
        console.log(`Model ${modelId} has no file path`);
        errors.push({ modelId, error: 'Model has no file path' });
        continue;
      }
      
      // Add the .3mf file only if requested and model is a 3MF model
      if (typesToDelete.includes('3mf') && model.filePath.endsWith('.3mf')) {
        const threeMfPath = path.isAbsolute(model.filePath) 
          ? model.filePath 
          : path.join(modelsDir, model.filePath);
        filesToDelete.push({ type: '3mf', path: threeMfPath });
      }
      
      // Add the .stl file only if requested and model is an STL model
      if (typesToDelete.includes('stl') && (model.filePath.endsWith('.stl') || model.filePath.endsWith('.STL'))) {
        const stlPath = path.isAbsolute(model.filePath) 
          ? model.filePath 
          : path.join(modelsDir, model.filePath);
        filesToDelete.push({ type: 'stl', path: stlPath });
      }
      
      // Add the corresponding munchie.json file only if requested
      if (typesToDelete.includes('json')) {
        let jsonFileName;
        if (model.filePath.endsWith('.3mf')) {
          jsonFileName = model.filePath.replace(/\.3mf$/i, '-munchie.json');
        } else if (model.filePath.endsWith('.stl') || model.filePath.endsWith('.STL')) {
          jsonFileName = model.filePath.replace(/\.stl$/i, '-stl-munchie.json').replace(/\.STL$/i, '-stl-munchie.json');
        }
        
        if (jsonFileName) {
          const jsonPath = path.isAbsolute(jsonFileName)
            ? jsonFileName
            : path.join(modelsDir, jsonFileName);
          filesToDelete.push({ type: 'json', path: jsonPath });
        }
      }

      console.log(`Files to delete for ${modelId}:`, filesToDelete);

      // Delete each file
      for (const fileInfo of filesToDelete) {
        try {
          console.log(`Attempting to delete file: ${fileInfo.path}`);
          if (fs.existsSync(fileInfo.path)) {
            fs.unlinkSync(fileInfo.path);
            console.log(`Successfully deleted: ${fileInfo.path}`);
            deleted.push({ modelId, type: fileInfo.type, path: path.relative(modelsDir, fileInfo.path) });
          } else {
            console.log(`File does not exist: ${fileInfo.path}`);
          }
        } catch (err) {
          console.error(`Error deleting file ${fileInfo.path}:`, err.message);
          errors.push({ modelId, type: fileInfo.type, error: err.message });
        }
      }
    }

  console.log(`Deletion summary: ${deleted.length} files deleted, ${errors.length} errors`);
  safeLog('Deleted files:', deleted);
  safeLog('Errors:', errors);

    res.json({ 
      success: errors.length === 0, 
      deleted, 
      errors,
      summary: `Deleted ${deleted.length} files for ${modelIds.length} models`
    });
    
  } catch (error) {
    console.error('Error deleting models:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to create a backup of all munchie.json files
app.post('/api/backup-munchie-files', async (req, res) => {
  try {
    const modelsDir = getAbsoluteModelsPath();
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      files: []
    };

    // Recursively find all munchie.json files
    function findMunchieFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findMunchieFiles(fullPath);
        } else if (entry.name.endsWith('-munchie.json')) {
          try {
            const relativePath = path.relative(modelsDir, fullPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            const jsonData = JSON.parse(content);
            
            backup.files.push({
              relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
              originalPath: relativePath.replace(/\\/g, '/'), // Store original path for restoration
              content: jsonData,
              hash: jsonData.hash || null, // Use hash for matching during restore
              size: Buffer.byteLength(content, 'utf8')
            });
          } catch (error) {
            console.error(`Error reading munchie file ${fullPath}:`, error);
          }
        }
      }
    }

    findMunchieFiles(modelsDir);

    // Compress the backup data
    const jsonString = JSON.stringify(backup, null, 2);
    const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));

    // Set headers for file download
    const timestamp = backup.timestamp.replace(/[:.]/g, '-').slice(0, 19);
    const filename = `munchie-backup-${timestamp}.gz`;
    
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', compressed.length);
    
    res.send(compressed);
    
    console.log(`Backup created: ${backup.files.length} munchie.json files, ${(compressed.length / 1024).toFixed(2)} KB compressed`);
    
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to restore munchie.json files from backup
app.post('/api/restore-munchie-files', async (req, res) => {
  try {
    const { backupData, strategy = 'hash-match' } = req.body;
    
    if (!backupData) {
      return res.status(400).json({ success: false, error: 'No backup data provided' });
    }

    let backup;
    try {
      // Parse the backup data (should be uncompressed JSON)
      backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid backup data format' });
    }

    if (!backup.files || !Array.isArray(backup.files)) {
      return res.status(400).json({ success: false, error: 'Invalid backup structure' });
    }

    const modelsDir = getAbsoluteModelsPath();
    const results = {
      restored: [],
      skipped: [],
      errors: [],
      strategy: strategy
    };

    // Create a map of existing 3MF files by their hashes for hash-based matching
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    const existingFiles = new Map(); // hash -> { munchieJsonPath, threeMFPath, currentHash }
    
    function mapExistingFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            mapExistingFiles(fullPath);
          } else if (entry.name.endsWith('.3mf')) {
            try {
              // Calculate the current hash of the 3MF file
              const currentHash = computeMD5(fullPath);
              const relativePath = path.relative(modelsDir, fullPath);
              
              // Find the corresponding munchie.json file
              const munchieJsonPath = fullPath.replace(/\.3mf$/i, '-munchie.json');
              
              if (fs.existsSync(munchieJsonPath)) {
                existingFiles.set(currentHash, {
                  munchieJsonPath: munchieJsonPath,
                  threeMFPath: fullPath,
                  relativeMunchieJsonPath: relativePath.replace(/\.3mf$/i, '-munchie.json').replace(/\\/g, '/'),
                  currentHash: currentHash
                });
              }
            } catch (error) {
              console.error(`Error processing 3MF file ${fullPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }

    mapExistingFiles(modelsDir);

    // Process each file in the backup
    for (const backupFile of backup.files) {
      try {
        let targetPath;
        let shouldRestore = false;
        let reason = '';

        if (strategy === 'hash-match' && backupFile.hash) {
          // Try to match by 3MF file hash first
          const existing = existingFiles.get(backupFile.hash);
          if (existing) {
            targetPath = existing.munchieJsonPath;
            shouldRestore = true;
            reason = `Hash match: ${backupFile.hash.substring(0, 8)}... -> ${path.basename(existing.threeMFPath)}`;
          } else {
            // If no hash match, try original path
            const originalPath = path.join(modelsDir, backupFile.originalPath);
            if (fs.existsSync(originalPath)) {
              targetPath = originalPath;
              shouldRestore = true;
              reason = 'Path match (no hash match found)';
            } else {
              results.skipped.push({
                originalPath: backupFile.originalPath,
                reason: 'No matching file found (hash or path)'
              });
              continue;
            }
          }
        } else if (strategy === 'path-match') {
          // Match by original path
          const originalPath = path.join(modelsDir, backupFile.originalPath);
          if (fs.existsSync(originalPath)) {
            targetPath = originalPath;
            shouldRestore = true;
            reason = 'Path match';
          } else {
            results.skipped.push({
              originalPath: backupFile.originalPath,
              reason: 'Original path not found'
            });
            continue;
          }
        } else {
          // Force restore to original path (create if necessary)
          targetPath = path.join(modelsDir, backupFile.originalPath);
          
          // Create directory if it doesn't exist
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          shouldRestore = true;
          reason = 'Force restore to original path';
        }

        if (shouldRestore) {
          // Write the restored file
          const restoredContent = JSON.stringify(backupFile.content, null, 2);
          fs.writeFileSync(targetPath, restoredContent, 'utf8');
          
          results.restored.push({
            originalPath: backupFile.originalPath,
            restoredPath: path.relative(modelsDir, targetPath).replace(/\\/g, '/'),
            reason: reason,
            size: backupFile.size
          });
        }
        
      } catch (error) {
        results.errors.push({
          originalPath: backupFile.originalPath,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      ...results,
      summary: `Restored ${results.restored.length} files, skipped ${results.skipped.length}, ${results.errors.length} errors`
    });

  console.log(`Restore completed: ${results.restored.length} restored, ${results.skipped.length} skipped, ${results.errors.length} errors`);
  safeLog('Restore details:', results);
    
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to restore munchie.json files from uploaded backup file
app.post('/api/restore-munchie-files/upload', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No backup file provided' });
    }

    const { strategy = 'hash-match' } = req.body;
    let backupData;

    // Check if file is gzipped
    if (req.file.originalname.endsWith('.gz')) {
      try {
        const decompressed = zlib.gunzipSync(req.file.buffer);
        backupData = decompressed.toString('utf8');
      } catch (error) {
        return res.status(400).json({ success: false, error: 'Failed to decompress backup file' });
      }
    } else {
      backupData = req.file.buffer.toString('utf8');
    }

    let backup;
    try {
      backup = JSON.parse(backupData);
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid backup file format' });
    }

    if (!backup.files || !Array.isArray(backup.files)) {
      return res.status(400).json({ success: false, error: 'Invalid backup structure' });
    }

    // Use the same restore logic as the JSON endpoint
    const modelsDir = getAbsoluteModelsPath();
    const results = {
      restored: [],
      skipped: [],
      errors: [],
      strategy: strategy
    };

    // Create a map of existing 3MF files by their hashes for hash-based matching
    const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
    const existingFiles = new Map(); // hash -> { munchieJsonPath, threeMFPath, currentHash }
    
    function mapExistingFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            mapExistingFiles(fullPath);
          } else if (entry.name.endsWith('.3mf')) {
            try {
              // Calculate the current hash of the 3MF file
              const currentHash = computeMD5(fullPath);
              const relativePath = path.relative(modelsDir, fullPath);
              
              // Find the corresponding munchie.json file
              const munchieJsonPath = fullPath.replace(/\.3mf$/i, '-munchie.json');
              
              if (fs.existsSync(munchieJsonPath)) {
                existingFiles.set(currentHash, {
                  munchieJsonPath: munchieJsonPath,
                  threeMFPath: fullPath,
                  relativeMunchieJsonPath: relativePath.replace(/\.3mf$/i, '-munchie.json').replace(/\\/g, '/'),
                  currentHash: currentHash
                });
              }
            } catch (error) {
              console.error(`Error processing 3MF file ${fullPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }

    mapExistingFiles(modelsDir);

    // Process each file in the backup
    for (const backupFile of backup.files) {
      try {
        let targetPath;
        let shouldRestore = false;
        let reason = '';

        if (strategy === 'hash-match' && backupFile.hash) {
          // Try to match by 3MF file hash first
          const existing = existingFiles.get(backupFile.hash);
          if (existing) {
            targetPath = existing.munchieJsonPath;
            shouldRestore = true;
            reason = `Hash match: ${backupFile.hash.substring(0, 8)}... -> ${path.basename(existing.threeMFPath)}`;
          } else {
            // If no hash match, try original path
            const originalPath = path.join(modelsDir, backupFile.originalPath);
            if (fs.existsSync(originalPath)) {
              targetPath = originalPath;
              shouldRestore = true;
              reason = 'Path match (no hash match found)';
            } else {
              results.skipped.push({
                originalPath: backupFile.originalPath,
                reason: 'No matching file found (hash or path)'
              });
              continue;
            }
          }
        } else if (strategy === 'path-match') {
          // Match by original path
          const originalPath = path.join(modelsDir, backupFile.originalPath);
          if (fs.existsSync(originalPath)) {
            targetPath = originalPath;
            shouldRestore = true;
            reason = 'Path match';
          } else {
            results.skipped.push({
              originalPath: backupFile.originalPath,
              reason: 'Original path not found'
            });
            continue;
          }
        } else {
          // Force restore to original path (create if necessary)
          targetPath = path.join(modelsDir, backupFile.originalPath);
          
          // Create directory if it doesn't exist
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          shouldRestore = true;
          reason = 'Force restore to original path';
        }

        if (shouldRestore) {
          // Write the restored file
          const restoredContent = JSON.stringify(backupFile.content, null, 2);
          fs.writeFileSync(targetPath, restoredContent, 'utf8');
          
          results.restored.push({
            originalPath: backupFile.originalPath,
            restoredPath: path.relative(modelsDir, targetPath).replace(/\\/g, '/'),
            reason: reason,
            size: backupFile.size
          });
        }
        
      } catch (error) {
        results.errors.push({
          originalPath: backupFile.originalPath,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      ...results,
      summary: `Restored ${results.restored.length} files, skipped ${results.skipped.length}, ${results.errors.length} errors`
    });

  console.log(`File upload restore completed: ${results.restored.length} restored, ${results.skipped.length} skipped, ${results.errors.length} errors`);
  safeLog('File upload restore details:', results);
    
  } catch (error) {
    console.error('File upload restore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React Router - catch all GET requests that aren't API or model routes
app.get(/^(?!\/api|\/models).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`3D Model Muncher backend API running on port ${PORT}`);
  console.log(`Frontend served from build directory`);
});
