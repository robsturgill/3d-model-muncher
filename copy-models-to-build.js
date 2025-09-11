const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy models directory to build directory
const modelsSource = path.join(__dirname, 'models');
const modelsDest = path.join(__dirname, 'build/models');

if (fs.existsSync(modelsSource)) {
  console.log('Copying models directory to build/models...');
  copyDir(modelsSource, modelsDest);
  console.log('✅ Models directory copied successfully!');
} else {
  console.log('❌ Models directory not found, skipping copy.');
  process.exit(1);
}
