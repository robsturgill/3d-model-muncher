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
    const dir = config.settings.modelDirectory || './models';
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

app.listen(PORT, () => {
  console.log(`3D Model Muncher backend API running on port ${PORT}`);
});
