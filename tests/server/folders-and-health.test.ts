import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTempModelsDir, setServerModelDir } from './helpers';

// Import the Express app exported by server.js
const app = require('../../server');

describe('health and model folders endpoints', () => {
  let tmp!: { root: string; cleanup: () => void };

  beforeEach(() => {
    tmp = createTempModelsDir();
    // create some nested dirs under models
    fs.mkdirSync(path.join(tmp.root, 'alpha', 'beta'), { recursive: true });
    fs.mkdirSync(path.join(tmp.root, 'gamma'), { recursive: true });
    setServerModelDir(tmp.root);
  });

  afterEach(() => {
    tmp.cleanup();
  });

  it('returns healthy status from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('lists model folders and includes uploads root', async () => {
    const res = await request(app).get('/api/model-folders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.folders)).toBe(true);
    const folders: string[] = res.body.folders;
    // normalize to forward slashes
    const norm = folders.map(f => f.replace(/\\/g, '/'));
    // should include default 'uploads' and discovered dirs
    expect(norm).toContain('uploads');
    expect(norm).toContain('alpha');
    expect(norm).toContain('alpha/beta');
    expect(norm).toContain('gamma');
  });

  it('creates a nested folder under models with /api/create-model-folder', async () => {
    const res1 = await request(app).post('/api/create-model-folder').send({ folder: 'new/child' });
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('success', true);
    expect(res1.body).toHaveProperty('created', true);
    expect(res1.body.path.replace(/\\/g, '/')).toBe('new/child');

    // idempotent - second call should report created: false
    const res2 = await request(app).post('/api/create-model-folder').send({ folder: '/new/child/' });
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('success', true);
    expect(res2.body).toHaveProperty('created', false);

    // verify on disk
    expect(fs.existsSync(path.join(tmp.root, 'new', 'child'))).toBe(true);
  });
});
