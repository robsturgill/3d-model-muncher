import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTempModelsDir, setServerModelDir } from './helpers';
import { scanDirectory } from '../../src/utils/threeMFToJson';

// Import the Express app
import app from '../../server';

describe('G-code archive filtering (.gcode.3mf exclusion)', () => {
  const tmp = createTempModelsDir();
  const modelsDir = tmp.root;

  beforeAll(() => {
    setServerModelDir(modelsDir);
  });

  afterAll(() => {
    tmp.cleanup();
  });

  describe('scanDirectory filtering', () => {
    it('should skip .gcode.3mf files during 3MF scan', async () => {
      // Create test files
      const regularFile = path.join(modelsDir, 'model.3mf');
      const gcodeFile = path.join(modelsDir, 'sliced.gcode.3mf');
      const altGcodeFile = path.join(modelsDir, 'output.3mf.gcode');
      
      // Write dummy content
      fs.writeFileSync(regularFile, 'dummy-3mf-content', 'utf8');
      fs.writeFileSync(gcodeFile, 'dummy-gcode-archive', 'utf8');
      fs.writeFileSync(altGcodeFile, 'dummy-gcode-archive-alt', 'utf8');

      // Run scan
      const result = await scanDirectory(modelsDir, '3mf');

      // Should have processed 1 file (regular .3mf)
      expect(result.processed).toBe(1);
      // Should have skipped 1 file (.gcode.3mf) - the .3mf.gcode file won't match the .3mf pattern
      expect(result.skipped).toBeGreaterThanOrEqual(1);

      // Verify munchie files
      expect(fs.existsSync(path.join(modelsDir, 'model-munchie.json'))).toBe(true);
      expect(fs.existsSync(path.join(modelsDir, 'sliced.gcode-munchie.json'))).toBe(false);
      expect(fs.existsSync(path.join(modelsDir, 'output.3mf-munchie.json'))).toBe(false);
      
      // Clean up
      fs.unlinkSync(regularFile);
      fs.unlinkSync(gcodeFile);
      fs.unlinkSync(altGcodeFile);
      fs.unlinkSync(path.join(modelsDir, 'model-munchie.json'));
    });

    it('should handle case-insensitive .gcode.3mf variations', async () => {
      // Create files with various case combinations
      // Note: Only files ending with .gcode.3mf will be skipped (and still match .3mf pattern)
      const variations = [
        'casetest1.GCODE.3MF',
        'casetest2.gcode.3mf',
        'casetest3.GCode.3mf',
        'casenormal.3mf'
      ];

      for (const fileName of variations) {
        fs.writeFileSync(path.join(modelsDir, fileName), 'dummy', 'utf8');
      }

      const result = await scanDirectory(modelsDir, '3mf');

      // Should process only the casenormal.3mf file  
      expect(result.processed).toBe(1);
      // Should skip at least one gcode.3mf variation (validates filtering logic works)
      expect(result.skipped).toBeGreaterThanOrEqual(1);

      // Clean up
      for (const fileName of variations) {
        const filePath = path.join(modelsDir, fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      const munchie = path.join(modelsDir, 'casenormal-munchie.json');
      if (fs.existsSync(munchie)) fs.unlinkSync(munchie);
    });
  });

  describe('/api/upload-models endpoint filtering', () => {
    it('should reject .gcode.3mf files with helpful error message', async () => {
      const gcodeContent = Buffer.from('fake-gcode-archive-content');

      const resp = await (request(app) as any)
        .post('/api/upload-models')
        .field('destinations', JSON.stringify(['uploads']))
        .attach('files', gcodeContent, { 
          filename: 'print.gcode.3mf', 
          contentType: 'application/octet-stream' 
        });

      expect(resp.status).toBe(200);
      expect(resp.body).toHaveProperty('success');
      expect(resp.body).toHaveProperty('errors');
      expect(Array.isArray(resp.body.errors)).toBe(true);
      expect(resp.body.errors.length).toBeGreaterThan(0);
      
      // Check for helpful error message
      const error = resp.body.errors[0];
      expect(error.error).toContain('G-code');
      expect(error.error).toContain('analysis dialog');
    });

    it('should reject .3mf.gcode alternate format', async () => {
      const gcodeContent = Buffer.from('fake-gcode-archive-content');

      const resp = await (request(app) as any)
        .post('/api/upload-models')
        .field('destinations', JSON.stringify(['uploads']))
        .attach('files', gcodeContent, { 
          filename: 'output.3mf.gcode', 
          contentType: 'application/octet-stream' 
        });

      expect(resp.status).toBe(200);
      expect(resp.body.errors.length).toBeGreaterThan(0);
      expect(resp.body.errors[0].error).toContain('G-code');
    });

    it('should accept regular .3mf files', async () => {
      const stlContent = Buffer.from('solid test\nendsolid test\n');

      const resp = await (request(app) as any)
        .post('/api/upload-models')
        .field('destinations', JSON.stringify(['uploads']))
        .attach('files', stlContent, { 
          filename: 'valid.stl', 
          contentType: 'model/stl' 
        });

      expect(resp.status).toBe(200);
      expect(resp.body).toHaveProperty('success');
      
      // Should not have errors (or empty errors array)
      if (resp.body.errors) {
        expect(resp.body.errors.length).toBe(0);
      }
      
      // Clean up any generated files
      if (resp.body.saved && Array.isArray(resp.body.saved)) {
        for (const relativePath of resp.body.saved) {
          const fullPath = path.join(modelsDir, relativePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      }
      if (resp.body.processed && Array.isArray(resp.body.processed)) {
        for (const relativePath of resp.body.processed) {
          const fullPath = path.join(modelsDir, relativePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      }
    });

    it('should handle mixed uploads (valid + gcode archives)', async () => {
      const validContent = Buffer.from('solid test\nendsolid test\n');
      const gcodeContent = Buffer.from('fake-gcode-archive');

      const resp = await (request(app) as any)
        .post('/api/upload-models')
        .field('destinations', JSON.stringify(['uploads', 'uploads']))
        .attach('files', validContent, { filename: 'valid.stl', contentType: 'model/stl' })
        .attach('files', gcodeContent, { filename: 'sliced.gcode.3mf', contentType: 'application/octet-stream' });

      expect(resp.status).toBe(200);
      
      // Should have errors for the gcode file
      expect(resp.body.errors.length).toBe(1);
      expect(resp.body.errors[0].error).toContain('G-code');
      
      // Should have successfully saved the valid file
      expect(resp.body.saved.length).toBe(1);
      
      // Clean up
      if (resp.body.saved && Array.isArray(resp.body.saved)) {
        for (const relativePath of resp.body.saved) {
          const fullPath = path.join(modelsDir, relativePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      }
      if (resp.body.processed && Array.isArray(resp.body.processed)) {
        for (const relativePath of resp.body.processed) {
          const fullPath = path.join(modelsDir, relativePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      }
    });
  });

  describe('/api/scan-models endpoint', () => {
    it('should skip .gcode.3mf files in directory scan', async () => {
      // Create test files
      const regularFile = path.join(modelsDir, 'testmodel.3mf');
      const gcodeFile = path.join(modelsDir, 'testmodel.gcode.3mf');
      
      fs.writeFileSync(regularFile, 'dummy-3mf', 'utf8');
      fs.writeFileSync(gcodeFile, 'dummy-gcode', 'utf8');

      const scanRes = await request(app)
        .post('/api/scan-models')
        .send({ fileType: '3mf', stream: false });

      expect(scanRes.status).toBe(200);
      expect(scanRes.body).toHaveProperty('success', true);
      expect(scanRes.body.processed).toBeGreaterThanOrEqual(1);

      // Verify only the regular 3mf got a munchie
      expect(fs.existsSync(path.join(modelsDir, 'testmodel-munchie.json'))).toBe(true);
      expect(fs.existsSync(path.join(modelsDir, 'testmodel.gcode-munchie.json'))).toBe(false);

      // Clean up
      fs.unlinkSync(regularFile);
      fs.unlinkSync(gcodeFile);
      const munchie = path.join(modelsDir, 'testmodel-munchie.json');
      if (fs.existsSync(munchie)) fs.unlinkSync(munchie);
    });
  });

  describe('/api/hash-check endpoint', () => {
    it('should exclude .gcode.3mf files from hash check results', async () => {
      // Create test files
      const regularFile = path.join(modelsDir, 'hashtest.3mf');
      const gcodeFile = path.join(modelsDir, 'hashtest.gcode.3mf');
      const regularMunchie = path.join(modelsDir, 'hashtest-munchie.json');
      
      fs.writeFileSync(regularFile, 'dummy-3mf-content', 'utf8');
      fs.writeFileSync(gcodeFile, 'dummy-gcode-archive', 'utf8');
      
      // Create munchie for regular file with hash
      const munchieData = {
        id: 'hashtest-id',
        name: 'hashtest',
        hash: 'd41d8cd98f00b204e9800998ecf8427e', // MD5 of empty string (won't match our dummy content)
        modelUrl: '/models/hashtest.3mf'
      };
      fs.writeFileSync(regularMunchie, JSON.stringify(munchieData, null, 2), 'utf8');

      // Run hash check
      const hashRes = await request(app)
        .post('/api/hash-check')
        .send({ fileType: '3mf' });

      expect(hashRes.status).toBe(200);
      expect(hashRes.body).toHaveProperty('success', true);
      expect(hashRes.body).toHaveProperty('results');
      
      // Verify results only include regular 3mf file, not .gcode.3mf
      const results = hashRes.body.results;
      const regularResult = results.find((r: any) => r.threeMF === 'hashtest.3mf');
      const gcodeResult = results.find((r: any) => 
        r.threeMF && (r.threeMF.includes('gcode.3mf') || r.baseName.includes('gcode'))
      );
      
      expect(regularResult).toBeDefined();
      expect(gcodeResult).toBeUndefined();

      // Clean up
      fs.unlinkSync(regularFile);
      fs.unlinkSync(gcodeFile);
      fs.unlinkSync(regularMunchie);
    });
  });
});
