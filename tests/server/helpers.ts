import fs from 'fs';
import path from 'path';
import os from 'os';

export function createTempModelsDir(): { root: string; cleanup: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mmm-models-'));
  return {
    root,
    cleanup: () => {
      try {
        // Recursively delete
        const rm = (p: string) => {
          if (!fs.existsSync(p)) return;
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(p)) rm(path.join(p, entry));
            fs.rmdirSync(p);
          } else {
            fs.unlinkSync(p);
          }
        };
        rm(root);
      } catch {}
    }
  };
}

export function writeJson(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function setServerModelDir(modelsDir: string) {
  // Write server-side config to data/config.json so server points to our temp models dir
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const configPath = path.join(dataDir, 'config.json');
  const config = {
    version: '1.0.0',
    categories: [],
    settings: { modelDirectory: modelsDir },
    filters: {},
    lastModified: new Date().toISOString()
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
