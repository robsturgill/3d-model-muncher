import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Import the Express app exported by server.js
const app = require('../server') as any;

const modelsDir = path.join(process.cwd(), 'models');
const uploadsDir = path.join(modelsDir, 'uploads');

// Ensure uploads dir exists for test and is cleaned up after
beforeAll(() => {
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
});

afterAll(() => {
  // Try to remove any files created in uploads during the test
  try {
    const entries = fs.readdirSync(uploadsDir);
    for (const e of entries) {
      const p = path.join(uploadsDir, e);
      try { fs.unlinkSync(p); } catch (err) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
});

describe('POST /api/upload-models', () => {
  it('uploads a small stl file and returns saved/processed entries', async () => {
    const stlContent = Buffer.from(`solid test\nendsolid test\n`);

    const resp = await request(app)
      .post('/api/upload-models')
      .field('destinations', JSON.stringify(['uploads']))
      .attach('files', stlContent, { filename: 'test_upload.stl', contentType: 'application/sla' });

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('success');
    expect(resp.body).toHaveProperty('saved');
    expect(Array.isArray(resp.body.saved)).toBe(true);
    // Clean up generated munchie file if present
    if (resp.body.processed && Array.isArray(resp.body.processed)) {
      for (const p of resp.body.processed) {
        const full = path.join(modelsDir, p);
        try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
      }
    }
  });
});
