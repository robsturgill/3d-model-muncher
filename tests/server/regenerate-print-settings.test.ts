import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTempModelsDir, setServerModelDir, writeJson } from './helpers';

// Import the Express app (CommonJS export)
const app = require('../../server');

describe('/api/regenerate-munchie-files printSettings behavior', () => {
  let tmp!: { root: string; cleanup: () => void };

  beforeEach(() => {
    tmp = createTempModelsDir();
    setServerModelDir(tmp.root);
  });

  afterEach(() => tmp.cleanup());

  it('preserves STL printSettings (including printer) after regeneration', async () => {
    // Arrange: create an STL + existing -stl-munchie.json with user-edited printSettings
    const base = path.join(tmp.root, 'mesh');
    const stlPath = base + '.stl';
    const munchiePath = base + '-stl-munchie.json';

    fs.writeFileSync(stlPath, 'solid not-a-real-stl');
    writeJson(munchiePath, {
      id: 'mesh',
      name: 'Mesh',
      printSettings: {
        layerHeight: '0.28',
        infill: '15%',
        nozzle: '0.6',
        printer: 'Bambu A1 Mini'
      }
    });

    // Act: regenerate by file path
    const res = await request(app)
      .post('/api/regenerate-munchie-files')
      .send({ filePaths: ['mesh.stl'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');

    // Assert: STL settings should be preserved
    const saved = JSON.parse(fs.readFileSync(munchiePath, 'utf8'));
    expect(saved.printSettings).toBeTruthy();
    expect(saved.printSettings.layerHeight).toBe('0.28');
    expect(saved.printSettings.infill).toBe('15%');
    expect(saved.printSettings.nozzle).toBe('0.6');
    expect(saved.printSettings.printer).toBe('Bambu A1 Mini');
  });

  it('preserves STL printSettings when regenerating by modelIds (separate step)', async () => {
    // Arrange: Create STL + munchie with custom printSettings
    const base = path.join(tmp.root, 'part');
    const stlPath = base + '.stl';
    const munchiePath = base + '-stl-munchie.json';

    fs.writeFileSync(stlPath, 'solid not-a-real-stl');
    // Simulate a pre-existing munchie with an id as the UI would have
    writeJson(munchiePath, {
      id: 'part-id',
      name: 'Part',
      printSettings: { layerHeight: '0.16', infill: '20%', nozzle: '0.4', printer: 'P1S' }
    });

    // Act: Regenerate using modelIds path
    const res = await request(app)
      .post('/api/regenerate-munchie-files')
      .send({ modelIds: ['part-id'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');

    // Assert: Still preserved
    const saved = JSON.parse(fs.readFileSync(munchiePath, 'utf8'));
    expect(saved.printSettings.layerHeight).toBe('0.16');
    expect(saved.printSettings.infill).toBe('20%');
    expect(saved.printSettings.nozzle).toBe('0.4');
    expect(saved.printSettings.printer).toBe('P1S');
  });

  it('refreshes 3MF printSettings when regenerating by modelIds (separate step)', async () => {
    // Arrange: Create 3MF + munchie with user-edited printSettings
    const base = path.join(tmp.root, 'model');
    const file = base + '.3mf';
    const munchiePath = base + '-munchie.json';

    fs.writeFileSync(file, 'not-a-real-3mf');
    writeJson(munchiePath, {
      id: 'model-id',
      name: 'Model',
      printSettings: { layerHeight: '0.12', infill: '30%', nozzle: '0.4', printer: 'User' }
    });

    // Act
    const res = await request(app)
      .post('/api/regenerate-munchie-files')
      .send({ modelIds: ['model-id'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');

    // Assert: 3MF settings reset to parsed defaults for invalid 3MF (empties)
    const saved = JSON.parse(fs.readFileSync(munchiePath, 'utf8'));
    expect(saved.printSettings.layerHeight).toBe('');
    expect(saved.printSettings.infill).toBe('');
    expect(saved.printSettings.nozzle).toBe('');
    expect(Object.prototype.hasOwnProperty.call(saved.printSettings, 'printer')).toBe(false);
  });
  it('refreshes 3MF printSettings from parsed data (ignores user edits)', async () => {
    // Arrange: create a 3MF + existing -munchie.json with user-edited printSettings
    const base = path.join(tmp.root, 'thing');
    const threePath = base + '.3mf';
    const munchiePath = base + '-munchie.json';

    // Not a real 3MF; parser will fail to extract settings and leave defaults ("")
    fs.writeFileSync(threePath, 'not-a-real-3mf');
    writeJson(munchiePath, {
      id: 'thing',
      name: 'Thing',
      printSettings: {
        layerHeight: '0.20',
        infill: '25%',
        nozzle: '0.4',
        printer: 'User Printer'
      }
    });

    // Act: regenerate by file path
    const res = await request(app)
      .post('/api/regenerate-munchie-files')
      .send({ filePaths: ['thing.3mf'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');

    // Assert: 3MF settings should reflect parsed values (defaults here), not the prior user edits
    const saved = JSON.parse(fs.readFileSync(munchiePath, 'utf8'));
    expect(saved.printSettings).toBeTruthy();
    expect(saved.printSettings.layerHeight).toBe('');
    expect(saved.printSettings.infill).toBe('');
    expect(saved.printSettings.nozzle).toBe('');
    // printer should be omitted or undefined after stringify
    expect(Object.prototype.hasOwnProperty.call(saved.printSettings, 'printer')).toBe(false);
  });
});
