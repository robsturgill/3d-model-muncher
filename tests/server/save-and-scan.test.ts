import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTempModelsDir, writeJson } from './helpers';

// Import the Express app
import app from '../../server';

function setModelDir(modelsDir: string) {
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

describe('save-model merge and scan preservation', () => {
  const tmp = createTempModelsDir();
  const modelsDir = tmp.root;

  beforeAll(() => {
    setModelDir(modelsDir);
  });

  afterAll(() => {
    tmp.cleanup();
  });

  it('preserves user fields across /api/scan-models and merges via /api/save-model', async () => {
    // Seed a minimal 3MF and its munchie JSON (simulate generated file)
    const base = path.join(modelsDir, 'sample');
    const threeMF = base + '.3mf';
    // Write a tiny dummy 3MF (any bytes; parse3MF will try but server scan skips if JSON exists)
    fs.writeFileSync(threeMF, 'not-a-real-3mf', 'utf8');

    const munchiePath = base + '-munchie.json';
    const initial = {
      id: 'sample-id',
      name: 'Sample',
      parsedImages: [],
      tags: ['One'],
      isPrinted: false,
      printTime: '',
      filamentUsed: '',
      category: 'Uncategorized',
      description: '',
      fileSize: '0 MB',
      modelUrl: '/models/sample.3mf',
      license: '',
      notes: '',
      hash: 'abc123',
      printSettings: { layerHeight: '', infill: '', nozzle: '' },
      price: 0,
      userDefined: { description: 'hello' }
    };
    writeJson(munchiePath, initial);

    // Run a scan that should migrate but not clobber user fields
    const scanRes = await request(app).post('/api/scan-models').send({ fileType: '3mf', stream: false });
    expect(scanRes.status).toBe(200);
    expect(scanRes.body).toHaveProperty('success', true);

    // Now update via save-model with top-level changes and nested userDefined
    const saveRes = await request(app).post('/api/save-model').send({
      filePath: path.relative(modelsDir, munchiePath).replace(/\\/g, '/'),
      changes: {
        tags: ['one', 'Two', 'two'],
        category: 'Props',
        userDefined: { description: 'updated', images: ['data:image/png;base64,Zm9v'] }
      }
    });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body).toHaveProperty('success', true);
    expect(Array.isArray(saveRes.body.cleaned_related_files || [])).toBe(true);

    // Read back file and assert merge semantics
    const saved = JSON.parse(fs.readFileSync(munchiePath, 'utf8'));
    // Tags should be deduped case-insensitively but preserve first casing
    expect(saved.tags).toEqual(['one', 'Two']);
    // Category updated
    expect(saved.category).toBe('Props');
    // userDefined merged with images and thumbnail when present
    expect(saved.userDefined.description).toBe('updated');
    expect(Array.isArray(saved.userDefined.images)).toBe(true);
    // Ensure deprecated top-level fields are not present
    expect('images' in saved).toBe(false);
    expect('thumbnail' in saved).toBe(false);
  });
});
