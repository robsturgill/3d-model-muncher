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
app.use(express.json());

// API endpoint to get all model data
app.get('/api/models', async (req, res) => {
  try {
    const config = ConfigManager.loadConfig();
    // Ensure config.settings exists and fallback to './models' if not
    const dir = (config.settings && config.settings.modelDirectory) || './models';
    const absolutePath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    
    // Read all files in the directory
    const files = fs.readdirSync(absolutePath);
    
    // Filter for JSON files ending with -munchie.json
    const modelFiles = files.filter(file => file.endsWith('-munchie.json'));
    
    // Load and parse each file
    const models = modelFiles.map(file => {
      const filePath = path.join(absolutePath, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    });
    
    res.json(models);
  } catch (error) {
    console.error('Error loading models:', error);
    res.status(500).json({ success: false, message: 'Failed to load models', error: error.message });
  }
});

// API endpoint to trigger model directory scan and JSON generation
app.post('/api/scan-models', async (req, res) => {
  try {
    // Use config or default directory
    const config = ConfigManager.loadConfig();
    const dir = config.settings.modelDirectory || './models';
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
  const modelsDir = path.join(__dirname, 'models');
  let result = [];
  try {
    const files = fs.readdirSync(modelsDir);
    files.forEach(file => {
      if (file.toLowerCase().endsWith('-munchie.json')) {
        const filePath = path.join(modelsDir, file);
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const json = JSON.parse(data);
          result.push({
            fileName: file,
            hash: json.hash,
            modelUrl: '/models/' + file
          });
        } catch (e) {
          // skip unreadable or invalid files
        }
      }
    });
    res.json({ success: true, munchies: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- API: Hash check for all .3mf files and their -munchie.json ---
app.get('/api/hash-check', async (req, res) => {
  const modelsDir = path.join(__dirname, 'models');
  const { computeMD5 } = require('./dist-backend/utils/threeMFToJson');
  let result = [];
  let seenHashes = new Set();
  let hashToFiles = {};
  let errors = [];
  try {
    const files = fs.readdirSync(modelsDir);
    // Map .3mf base names to their .3mf and -munchie.json
    const modelMap = {};
    files.forEach(file => {
      if (file.toLowerCase().endsWith('.3mf')) {
        const base = file.replace(/\.3mf$/i, '');
        modelMap[base] = modelMap[base] || {};
        modelMap[base].threeMF = file;
      } else if (file.toLowerCase().endsWith('-munchie.json')) {
        const base = file.replace(/-munchie\.json$/i, '');
        modelMap[base] = modelMap[base] || {};
        modelMap[base].json = file;
      }
    });

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
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`3D Model Muncher backend API running on port ${PORT}`);
});
