import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, it, expect } from 'vitest';

// Validate all existing munchie.json files against a permissive schema
const schemaPath = path.join(process.cwd(), 'tests', 'schemas', 'munchie.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

function* walk(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

describe('munchie schema contract', () => {
  it('validates existing -munchie.json files in models/', () => {
    const modelsDir = path.join(process.cwd(), 'models');
    if (!fs.existsSync(modelsDir)) return; // skip when absent
    const failures: Array<{ file: string; errors: any[] }> = [];

    for (const file of walk(modelsDir)) {
      if (!/-munchie\.json$/i.test(file) && !/-stl-munchie\.json$/i.test(file)) continue;
      try {
        const raw = fs.readFileSync(file, 'utf8');
        if (!raw || raw.trim() === '') continue;
        const json = JSON.parse(raw);
        const ok = validate(json);
        if (!ok) {
          failures.push({ file: path.relative(modelsDir, file), errors: validate.errors || [] });
        }
      } catch (e) {
        failures.push({ file: path.relative(modelsDir, file), errors: [{ message: 'unreadable or invalid JSON' }] });
      }
    }

    if (failures.length > 0) {
      const msg = failures.map(f => `${f.file}: ${JSON.stringify(f.errors)}`).join('\n');
      // Provide a single aggregated failure for easier triage
      expect.fail(`Schema validation failures (first 10 shown):\n${msg.split('\n').slice(0, 10).join('\n')}`);
    } else {
      expect(true).toBe(true);
    }
  });
});
