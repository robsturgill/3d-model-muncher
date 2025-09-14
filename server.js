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
  const { filePath, id, ...changes } = req.body;
  console.log('Save model request:', { filePath, changes });
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'No filePath provided' });
  }
  try {
    // Resolve relative paths to absolute paths
    let absoluteFilePath;
    if (path.isAbsolute(filePath)) {
      absoluteFilePath = filePath;
    } else {
      // filePath should be relative to models directory (e.g., 'Munchie-munchie.json')
      absoluteFilePath = path.join(absoluteModelPath, filePath);
    }
    
    console.log('Resolved file path for saving:', absoluteFilePath);
    
    // Load existing model JSON
    let existing = {};
    if (fs.existsSync(absoluteFilePath)) {
      existing = JSON.parse(fs.readFileSync(absoluteFilePath, 'utf-8'));
    }
    
    // Remove filePath and other computed properties from changes to prevent them from being saved
    const { filePath: _, modelUrl: __, ...cleanChanges } = changes;
    
    // Merge changes (excluding computed properties)
    const updated = { ...existing, ...cleanChanges };
    fs.writeFileSync(absoluteFilePath, JSON.stringify(updated, null, 2), 'utf-8');
    console.log('Model updated and saved to:', absoluteFilePath);
    res.json({ success: true });
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

// --- API: Get all -munchie.json files and their hashes ---

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
    const { filePath } = req.query;
    console.log('Load model request for:', filePath);
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file path' });
    }

    // Resolve the path relative to the application root
    const fullPath = path.resolve(filePath);
    console.log('Resolved path:', fullPath);

    // Ensure the path is within the models directory for security
    const modelsDir = path.resolve(getModelsDirectory());
    if (!fullPath.startsWith(modelsDir)) {
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
    console.log('File content length:', fileContent.length);
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
    console.log('Deleted files:', deleted);
    console.log('Errors:', errors);

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
