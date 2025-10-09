import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createTempModelsDir, setServerModelDir, writeJson } from './helpers';

const app = require('../../server');

describe('munchie-files and hash-check endpoints', () => {
  let tmp!: { root: string; cleanup: () => void };

  beforeEach(() => {
    tmp = createTempModelsDir();
    setServerModelDir(tmp.root);
  });

  afterEach(() => tmp.cleanup());

  it('returns -munchie.json entries with hash via /api/munchie-files', async () => {
    // seed two munchie files
    const a = path.join(tmp.root, 'x', 'a-munchie.json');
    const b = path.join(tmp.root, 'b-munchie.json');
    fs.mkdirSync(path.dirname(a), { recursive: true });
    writeJson(a, { id: 'a', name: 'a', hash: 'h1' });
    writeJson(b, { id: 'b', name: 'b', hash: 'h2' });

    const res = await request(app).get('/api/munchie-files');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const paths = res.body.map((r: any) => r.modelUrl as string);
    expect(paths.every((p: string) => p.startsWith('/models/'))).toBe(true);
    const hashes = new Set(res.body.map((r: any) => r.hash));
    expect(hashes.has('h1')).toBe(true);
    expect(hashes.has('h2')).toBe(true);
  });

  it('hash-check filters by fileType and reports status', async () => {
    // seed one 3mf with munchie and one stl with munchie
    const three = path.join(tmp.root, 'thing');
    const stl = path.join(tmp.root, 'mesh');
    fs.writeFileSync(three + '.3mf', 'three');
    fs.writeFileSync(stl + '.stl', 'stl');
    writeJson(three + '-munchie.json', { id: 'T', name: 'T', hash: crypto.createHash('md5').update('three').digest('hex') });
    writeJson(stl + '-stl-munchie.json', { id: 'S', name: 'S', hash: crypto.createHash('md5').update('stl').digest('hex') });

    const res3 = await request(app).post('/api/hash-check').send({ fileType: '3mf' });
    expect(res3.status).toBe(200);
    expect(res3.body).toHaveProperty('success', true);
    const bases3 = res3.body.results.map((r: any) => String(r.baseName));
    // should include only 3mf base names; in this test they are top-level files
    expect(bases3.includes('thing')).toBe(true);
    // stl base should not be present in 3mf mode
    expect(bases3.includes('mesh')).toBe(false);

    const resStl = await request(app).post('/api/hash-check').send({ fileType: 'stl' });
    expect(resStl.status).toBe(200);
    const basesStl = resStl.body.results.map((r: any) => String(r.baseName));
    expect(basesStl.includes('mesh')).toBe(true);
  });
});
