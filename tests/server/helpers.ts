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
  // Write only a worker-specific config so tests never touch the real data/config.json
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const config = {
    version: '1.0.0',
    categories: [],
    settings: { modelDirectory: modelsDir },
    filters: {},
    lastModified: new Date().toISOString()
  };

  // Prefer Vitest/Jest worker id; if missing, use a local fallback id
  let workerId = (process.env as any).VITEST_WORKER_ID || (process.env as any).JEST_WORKER_ID;
  if (!workerId) {
    workerId = 'local';
    // Ensure server.js can discover the per-worker file by env var even in single-threaded runs
    (process.env as any).VITEST_WORKER_ID = workerId;
  }
  const workerConfigPath = path.join(dataDir, `config.vitest-${workerId}.json`);
  fs.writeFileSync(workerConfigPath, JSON.stringify(config, null, 2), 'utf8');
}
