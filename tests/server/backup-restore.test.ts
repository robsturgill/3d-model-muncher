import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import app from '../../server';
import { createTempModelsDir, writeJson, setServerModelDir } from './helpers';

function md5(content: string) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function backupAndParse(modelsDir: string) {
  setServerModelDir(modelsDir);
  const res = await request(app).post('/api/backup-munchie-files').send({});
  expect(res.status).toBe(200);
  return JSON.parse(zlib.gunzipSync(Buffer.from(res.body)).toString('utf8'));
}

// Exercise backup and restore endpoints on a tiny seed

describe('backup and restore round-trip', () => {
  const tmp = createTempModelsDir();
  const modelsDir = tmp.root;

  beforeAll(() => {
    setServerModelDir(modelsDir);
    const a = path.join(modelsDir, 'a.3mf');
    fs.writeFileSync(a, 'fake3mf');
    writeJson(path.join(modelsDir, 'a-munchie.json'), {
      id: 'a', name: 'A', parsedImages: [], tags: ['x'], isPrinted: false, printTime: '', filamentUsed: '',
      category: '', description: '', fileSize: '0 MB', modelUrl: '/models/a.3mf', license: '', notes: '', hash: 'h',
      printSettings: { layerHeight: '', infill: '', nozzle: '' }, price: 0, userDefined: {}
    });
  });

  afterAll(() => tmp.cleanup());

  it('creates a backup and restores to same paths', async () => {
    const backup = await request(app).post('/api/backup-munchie-files').send({});
    expect(backup.status).toBe(200);
    expect(backup.body && backup.body.length !== undefined ? backup.body.length : 1).toBeTruthy();

    const zlib = await import('zlib');
    const decompressed = zlib.gunzipSync(Buffer.from(backup.body));
    const json = JSON.parse(decompressed.toString('utf8'));

    const restore = await request(app).post('/api/restore-munchie-files').send({ backupData: json, strategy: 'path-match', collectionsStrategy: 'merge' });
    expect(restore.status).toBe(200);
    expect(restore.body.success).toBe(true);
    expect(Array.isArray(restore.body.restored)).toBe(true);
  });
});

describe('restore with deleted munchie.json sidecars', () => {
  let tmp: { root: string; cleanup: () => void };

  afterEach(() => tmp?.cleanup());

  it('hash-match restores 3MF sidecar after deletion', async () => {
    tmp = createTempModelsDir();
    const content = 'model-content-3mf';
    fs.writeFileSync(path.join(tmp.root, 'model.3mf'), content);
    writeJson(path.join(tmp.root, 'model-munchie.json'), {
      id: 'm1', name: 'Model', hash: md5(content), tags: ['tag1'],
    });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'model-munchie.json'));
    expect(fs.existsSync(path.join(tmp.root, 'model-munchie.json'))).toBe(false);

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'hash-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(1);
    expect(res.body.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp.root, 'model-munchie.json'))).toBe(true);
    const restored = JSON.parse(fs.readFileSync(path.join(tmp.root, 'model-munchie.json'), 'utf8'));
    expect(restored.tags).toEqual(['tag1']);
  });

  it('path-match restores 3MF sidecar after deletion', async () => {
    tmp = createTempModelsDir();
    fs.writeFileSync(path.join(tmp.root, 'model.3mf'), 'content');
    writeJson(path.join(tmp.root, 'model-munchie.json'), { id: 'm2', name: 'Model', tags: ['tag2'] });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'model-munchie.json'));

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'path-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(1);
    expect(res.body.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp.root, 'model-munchie.json'))).toBe(true);
    const restored = JSON.parse(fs.readFileSync(path.join(tmp.root, 'model-munchie.json'), 'utf8'));
    expect(restored.tags).toEqual(['tag2']);
  });

  it('path-match restores STL sidecar after deletion', async () => {
    tmp = createTempModelsDir();
    fs.writeFileSync(path.join(tmp.root, 'mesh.stl'), 'stl-content');
    writeJson(path.join(tmp.root, 'mesh-stl-munchie.json'), { id: 's1', name: 'Mesh', tags: ['stltag'] });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'mesh-stl-munchie.json'));

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'path-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(1);
    expect(res.body.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp.root, 'mesh-stl-munchie.json'))).toBe(true);
    const restored = JSON.parse(fs.readFileSync(path.join(tmp.root, 'mesh-stl-munchie.json'), 'utf8'));
    expect(restored.tags).toEqual(['stltag']);
  });

  it('hash-match restores STL sidecar after deletion', async () => {
    tmp = createTempModelsDir();
    const content = 'stl-model-content';
    fs.writeFileSync(path.join(tmp.root, 'mesh.stl'), content);
    writeJson(path.join(tmp.root, 'mesh-stl-munchie.json'), {
      id: 's2', name: 'Mesh', hash: md5(content), tags: ['stlhash'],
    });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'mesh-stl-munchie.json'));

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'hash-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(1);
    expect(res.body.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp.root, 'mesh-stl-munchie.json'))).toBe(true);
    const restored = JSON.parse(fs.readFileSync(path.join(tmp.root, 'mesh-stl-munchie.json'), 'utf8'));
    expect(restored.tags).toEqual(['stlhash']);
  });

  it('hash-match skips file when model file is also absent', async () => {
    tmp = createTempModelsDir();
    const content = 'gone-model';
    fs.writeFileSync(path.join(tmp.root, 'gone.3mf'), content);
    writeJson(path.join(tmp.root, 'gone-munchie.json'), { id: 'g1', name: 'Gone', hash: md5(content) });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'gone-munchie.json'));
    fs.unlinkSync(path.join(tmp.root, 'gone.3mf'));

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'hash-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(0);
    expect(res.body.skipped).toHaveLength(1);
  });

  it('path-match skips file when model file is also absent', async () => {
    tmp = createTempModelsDir();
    fs.writeFileSync(path.join(tmp.root, 'gone.3mf'), 'content');
    writeJson(path.join(tmp.root, 'gone-munchie.json'), { id: 'g2', name: 'Gone' });

    const json = await backupAndParse(tmp.root);

    fs.unlinkSync(path.join(tmp.root, 'gone-munchie.json'));
    fs.unlinkSync(path.join(tmp.root, 'gone.3mf'));

    const res = await request(app).post('/api/restore-munchie-files')
      .send({ backupData: json, strategy: 'path-match', collectionsStrategy: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.restored).toHaveLength(0);
    expect(res.body.skipped).toHaveLength(1);
  });
});
