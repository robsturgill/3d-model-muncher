import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import app from '../../server';
import { createTempModelsDir, writeJson, setServerModelDir } from './helpers';

function rel(p: string) { return p.replace(/\\/g, '/'); }

describe('verify-file and models listing', () => {
  const tmp = createTempModelsDir();
  const modelsDir = tmp.root;

  beforeAll(() => {
    setServerModelDir(modelsDir);
    // seed a simple STL entry that looks like a real one
    const base = path.join(modelsDir, 'folder', 'thing');
    const stl = base + '.stl';
    const json = base + '-stl-munchie.json';
    fs.mkdirSync(path.dirname(stl), { recursive: true });
    fs.writeFileSync(stl, 'solid test');
    writeJson(json, {
      id: 'thing', name: 'Thing', parsedImages: [], tags: [], isPrinted: false,
      printTime: '', filamentUsed: '', category: '', description: '', fileSize: '0 MB',
      modelUrl: '/models/folder/thing.stl', license: '', notes: '', hash: 'x',
      printSettings: { layerHeight: '', infill: '', nozzle: '' }, price: 0, userDefined: {}
    });
  });

  // Other test files update the server's model directory; reaffirm ours before each test
  beforeEach(() => {
    setServerModelDir(modelsDir);
  });

  afterAll(() => tmp.cleanup());

  it('rejects traversal and absolutes in /api/verify-file', async () => {
    // These should fail fast with 4xx
    for (const p of ['../etc/passwd', 'C:/Windows/system32', '//server/share']) {
      const res = await request(app).post('/api/verify-file').send({ path: p });
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
    // Leading slash is normalized to relative and returns 200 with exists=false
    const ok = await request(app).post('/api/verify-file').send({ path: '/abs/leading' });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.exists).toBe(false);
  });

  it('verifies an existing relative file', async () => {
    const res = await request(app).post('/api/verify-file').send({ path: rel('folder/thing.stl') });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.exists).toBe(true);
    expect(res.body.isFile).toBe(true);
  });

  it('lists models and includes proper filePath/modelUrl', async () => {
    const list = await request(app).get('/api/models');
    expect(list.status).toBe(200);
    const arr = Array.isArray(list.body) ? list.body : [];
    const found = arr.find((m: any) => m.id === 'thing');
    expect(found).toBeTruthy();
    const normalizedPath = String(found.filePath).replace(/\\/g, '/');
    expect(normalizedPath).toMatch(/folder\/thing\.stl$/i);
    expect(found.modelUrl).toMatch(/\/models\/folder\/thing\.stl$/i);
  });
});
