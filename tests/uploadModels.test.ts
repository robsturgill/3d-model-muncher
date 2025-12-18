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

    const resp = await (request(app) as any)
      .post('/api/upload-models')
      .field('destinations', JSON.stringify(['uploads']))
      .attach('files', stlContent, { filename: 'test_upload.stl', contentType: 'model/stl' });

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

  it('uploads a file with uppercase .STL extension and processes it correctly', async () => {
    const stlContent = Buffer.from(`solid uppercase_test\nendsolid uppercase_test\n`);

    const resp = await (request(app) as any)
      .post('/api/upload-models')
      .field('destinations', JSON.stringify(['uploads']))
      .attach('files', stlContent, { filename: 'test_UPPERCASE.STL', contentType: 'model/stl' });

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('success');
    expect(resp.body).toHaveProperty('saved');
    expect(Array.isArray(resp.body.saved)).toBe(true);
    expect(resp.body.saved.length).toBeGreaterThan(0);
    
    // Verify the file was saved with correct case
    const savedPath = resp.body.saved[0];
    expect(savedPath).toMatch(/test_UPPERCASE\.STL$/i);
    
    // Clean up
    if (resp.body.processed && Array.isArray(resp.body.processed)) {
      for (const p of resp.body.processed) {
        const full = path.join(modelsDir, p);
        try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
      }
    }
    if (resp.body.saved && Array.isArray(resp.body.saved)) {
      for (const p of resp.body.saved) {
        const full = path.join(modelsDir, p);
        try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
      }
    }
  });

  it('uploads a file with uppercase .3MF extension and processes it correctly', async () => {
    // Minimal valid 3MF content (simplified for testing)
    const threeMFContent = Buffer.from('PK'); // ZIP file signature for 3MF

    const resp = await (request(app) as any)
      .post('/api/upload-models')
      .field('destinations', JSON.stringify(['uploads']))
      .attach('files', threeMFContent, { filename: 'test_UPPERCASE.3MF', contentType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('success');
    expect(resp.body).toHaveProperty('saved');
    expect(Array.isArray(resp.body.saved)).toBe(true);
    expect(resp.body.saved.length).toBeGreaterThan(0);
    
    // Verify the file was saved with correct case
    const savedPath = resp.body.saved[0];
    expect(savedPath).toMatch(/test_UPPERCASE\.3MF$/i);
    
    // Clean up
    if (resp.body.processed && Array.isArray(resp.body.processed)) {
      for (const p of resp.body.processed) {
        const full = path.join(modelsDir, p);
        try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
      }
    }
    if (resp.body.saved && Array.isArray(resp.body.saved)) {
      for (const p of resp.body.saved) {
        const full = path.join(modelsDir, p);
        try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
      }
    }
  });
});
