// Simple Express server for 3D Model Muncher backend API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scanDirectory } = require('./dist-backend/utils/threeMFToJson');
const { ConfigManager } = require('./dist-backend/utils/configManager');

const app = express();
const PORT = process.env.PORT || 3001;

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
      // If relative path (like 'models/file.json'), resolve it relative to the models directory
      if (filePath.startsWith('models/')) {
        absoluteFilePath = path.join(absoluteModelPath, filePath.replace('models/', ''));
      } else {
        absoluteFilePath = path.join(absoluteModelPath, filePath);
      }
    }
    
    console.log('Resolved file path:', absoluteFilePath);
    
    // Load existing model JSON
    let existing = {};
    if (fs.existsSync(absoluteFilePath)) {
      existing = JSON.parse(fs.readFileSync(absoluteFilePath, 'utf-8'));
    }
    // Merge changes
    const updated = { ...existing, ...changes };
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
        } else if (entry.name.endsWith('-munchie.json')) {
          // Load and parse each munchie file
          console.log(`Found munchie file: ${fullPath}`);
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const model = JSON.parse(fileContent);
            // Add relative path information for proper URL construction
            const relativePath = path.relative(absolutePath, fullPath);
            model.modelUrl = '/models/' + relativePath.replace(/\\/g, '/').replace('-munchie.json', '.3mf');
            console.log(`Added model: ${model.name} with URL: ${model.modelUrl}`);
            models.push(model);
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
    const dir = getModelsDirectory();
    await scanDirectory(dir);
    res.json({ success: true, message: 'Model JSON files generated successfully.' });
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
app.get('/api/hash-check', async (req, res) => {
  try {
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
          if (relativePath.toLowerCase().endsWith('.3mf')) {
            const base = relativePath.replace(/\.3mf$/i, '');
            modelMap[base] = modelMap[base] || {};
            modelMap[base].threeMF = relativePath;
          } else if (relativePath.toLowerCase().endsWith('-munchie.json')) {
            const base = relativePath.replace(/-munchie\.json$/i, '');
            modelMap[base] = modelMap[base] || {};
            modelMap[base].json = relativePath;
          }
        }
      }
    }

    // Start recursive scan
    scanDirectory(modelsDir);

    // Process all found models
    for (const base in modelMap) {
      const entry = modelMap[base];
      const threeMFPath = entry.threeMF ? path.join(modelsDir, entry.threeMF) : null;
      const jsonPath = entry.json ? path.join(modelsDir, entry.json) : null;
      let status = 'ok';
      let details = '';
      let hash = null;
      let storedHash = null;

      if (!threeMFPath) {
        status = 'missing-3mf';
        details = 'Missing .3mf file';
      } else if (!jsonPath) {
        status = 'missing-json';
        details = 'Missing -munchie.json file';
      } else {
        try {
          hash = computeMD5(threeMFPath);
          const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          storedHash = json.hash;
          if (!storedHash) {
            status = 'missing-hash';
            details = 'No hash in JSON';
          } else if (hash !== storedHash) {
            status = 'hash-mismatch';
            details = `Hash mismatch: .3mf=${hash}, json=${storedHash}`;
          }
        } catch (e) {
          status = 'error';
          details = e.message;
        }
      }

      // Check for duplicate hashes
      if (hash) {
        if (seenHashes.has(hash)) {
          status = 'duplicate-hash';
          details = 'Duplicate hash found for another file';
          hashToFiles[hash].push(base);
        } else {
          seenHashes.add(hash);
          hashToFiles[hash] = [base];
        }
      }

      result.push({
        baseName: base,
        threeMF: entry.threeMF || null,
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
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file path' });
    }

    // Resolve the path relative to the application root
    const fullPath = path.resolve(filePath);

    // Ensure the path is within the models directory for security
    const modelsDir = path.resolve(getModelsDirectory());
    if (!fullPath.startsWith(modelsDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Read and parse the JSON file
    const modelData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
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

app.listen(PORT, () => {
  console.log(`3D Model Muncher backend API running on port ${PORT}`);
});
