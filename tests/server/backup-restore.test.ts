import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../server';
import { createTempModelsDir, writeJson, setServerModelDir } from './helpers';

function rel(p: string) { return p.replace(/\\/g, '/'); }

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
    // server returns gzipped binary; just ensure non-empty
    expect(backup.body && backup.body.length !== undefined ? backup.body.length : 1).toBeTruthy();

    // emulate client-side: gunzip, then call JSON restore
    const zlib = await import('zlib');
    const decompressed = zlib.gunzipSync(Buffer.from(backup.body));
    const json = JSON.parse(decompressed.toString('utf8'));

    const restore = await request(app).post('/api/restore-munchie-files').send({ backupData: json, strategy: 'path-match', collectionsStrategy: 'merge' });
    expect(restore.status).toBe(200);
    expect(restore.body.success).toBe(true);
    expect(Array.isArray(restore.body.restored)).toBe(true);
  });
});
