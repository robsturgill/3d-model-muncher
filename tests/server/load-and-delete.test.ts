import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTempModelsDir, setServerModelDir, writeJson } from './helpers';

const app = require('../../server');

describe('load-model by id and delete models', () => {
  let tmp!: { root: string; cleanup: () => void };

  beforeEach(() => {
    tmp = createTempModelsDir();
    setServerModelDir(tmp.root);
  });

  afterEach(() => tmp.cleanup());

  it('loads model JSON by id when provided', async () => {
    // seed a 3mf + munchie pair
    const base = path.join(tmp.root, 'folder', 'rocket');
    fs.mkdirSync(path.dirname(base), { recursive: true });
    fs.writeFileSync(base + '.3mf', 'dummy');
    const model = { id: 'rocket-123', name: 'rocket', hash: 'abc', fileSize: '0 MB' };
    writeJson(base + '-munchie.json', model);

    const res = await request(app).get('/api/load-model').query({ id: 'rocket-123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'rocket-123');
    expect(res.body).toHaveProperty('name', 'rocket');
  });

  it('deletes selected file types for model ids', async () => {
    // seed: one 3mf model and one stl model with munchie files
    const a = path.join(tmp.root, 'a');
    const b = path.join(tmp.root, 'b');
    fs.mkdirSync(tmp.root, { recursive: true });
    fs.writeFileSync(a + '.3mf', 'a');
    fs.writeFileSync(b + '.stl', 'b');
    writeJson(a + '-munchie.json', { id: 'A', name: 'A', hash: 'ha', fileSize: '0 MB' });
    writeJson(b + '-stl-munchie.json', { id: 'B', name: 'B', hash: 'hb', fileSize: '0 MB' });

    // Delete only JSON for A and only STL for B
    const res = await request(app).delete('/api/models/delete').send({ modelIds: ['A', 'B'], fileTypes: ['json', 'stl'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
    const deleted = res.body.deleted.map((d: any) => d.path.replace(/\\/g, '/'));
    // A: only -munchie.json removed, 3mf remains
    expect(fs.existsSync(a + '.3mf')).toBe(true);
    expect(fs.existsSync(a + '-munchie.json')).toBe(false);
    expect(deleted).toContain('a-munchie.json');
  // B: .stl removed and -stl-munchie.json removed because we asked for json too
  expect(fs.existsSync(b + '.stl')).toBe(false);
  expect(fs.existsSync(b + '-stl-munchie.json')).toBe(false);
  expect(deleted).toContain('b.stl');
  expect(deleted).toContain('b-stl-munchie.json');
  });
});
