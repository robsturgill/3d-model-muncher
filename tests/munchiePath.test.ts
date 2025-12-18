/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { deriveMunchieCandidates } from '../src/utils/munchiePath';

describe('deriveMunchieCandidates', () => {
  describe('filePath handling', () => {
    it('converts lowercase .3mf to -munchie.json', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test.3mf' });
      expect(result).toContain('test-munchie.json');
    });

    it('converts uppercase .3MF to -munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test.3MF' });
      expect(result).toContain('test-munchie.json');
    });

    it('converts mixed case .3Mf to -munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test.3Mf' });
      expect(result).toContain('test-munchie.json');
    });

    it('converts lowercase .stl to -stl-munchie.json', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/part.stl' });
      expect(result).toContain('part-stl-munchie.json');
    });

    it('converts uppercase .STL to -stl-munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/part.STL' });
      expect(result).toContain('part-stl-munchie.json');
    });

    it('converts mixed case .Stl to -stl-munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/part.Stl' });
      expect(result).toContain('part-stl-munchie.json');
    });

    it('handles paths with subdirectories and uppercase extensions', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/folder/subfolder/model.STL' });
      expect(result).toContain('folder/subfolder/model-stl-munchie.json');
    });

    it('handles backslash paths with uppercase extensions', () => {
      const result = deriveMunchieCandidates({ filePath: 'models\\folder\\test.3MF' });
      expect(result).toContain('folder/test-munchie.json');
    });

    it('handles absolute Windows paths with uppercase extensions', () => {
      const result = deriveMunchieCandidates({ filePath: 'C:\\models\\test.STL' });
      expect(result).toContain('C:/models/test-stl-munchie.json');
    });

    it('strips /models/ prefix correctly', () => {
      const result = deriveMunchieCandidates({ filePath: '/models/test.3mf' });
      expect(result).toContain('test-munchie.json');
      expect(result).not.toContain('models/test-munchie.json');
    });

    it('preserves existing -munchie.json filenames', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test-munchie.json' });
      expect(result).toContain('test-munchie.json');
    });

    it('preserves existing -stl-munchie.json filenames', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test-stl-munchie.json' });
      expect(result).toContain('test-stl-munchie.json');
    });
  });

  describe('modelUrl handling', () => {
    it('converts lowercase .3mf modelUrl to -munchie.json', () => {
      const result = deriveMunchieCandidates({ modelUrl: 'models/test.3mf' });
      expect(result).toContain('test-munchie.json');
    });

    it('converts uppercase .3MF modelUrl to -munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ modelUrl: 'models/test.3MF' });
      expect(result).toContain('test-munchie.json');
    });

    it('converts lowercase .stl modelUrl to -stl-munchie.json', () => {
      const result = deriveMunchieCandidates({ modelUrl: '/models/part.stl' });
      expect(result).toContain('part-stl-munchie.json');
    });

    it('converts uppercase .STL modelUrl to -stl-munchie.json (case-insensitive)', () => {
      const result = deriveMunchieCandidates({ modelUrl: '/models/part.STL' });
      expect(result).toContain('part-stl-munchie.json');
    });

    it('handles mixed case extensions in modelUrl', () => {
      const result = deriveMunchieCandidates({ modelUrl: 'models/test.3Mf' });
      expect(result).toContain('test-munchie.json');
    });
  });

  describe('name/id fallback handling', () => {
    it('generates candidates from name when no filePath/modelUrl', () => {
      const result = deriveMunchieCandidates({ name: 'MyModel' });
      expect(result).toContain('MyModel-munchie.json');
      expect(result).toContain('MyModel-stl-munchie.json');
    });

    it('generates candidates from id when no filePath/modelUrl/name', () => {
      const result = deriveMunchieCandidates({ id: 'model-123' });
      expect(result).toContain('model-123-munchie.json');
      expect(result).toContain('model-123-stl-munchie.json');
    });
  });

  describe('deduplication', () => {
    it('does not return duplicate candidates', () => {
      const result = deriveMunchieCandidates({
        filePath: 'models/test.3mf',
        modelUrl: 'models/test.3mf',
        name: 'test'
      });
      
      const uniqueResults = Array.from(new Set(result));
      expect(result.length).toBe(uniqueResults.length);
    });

    it('deduplicates when filePath and modelUrl have different cases', () => {
      const result = deriveMunchieCandidates({
        filePath: 'models/test.3mf',
        modelUrl: 'models/test.3MF'
      });
      
      // Both should map to the same munchie path
      const munchieCount = result.filter(r => r === 'test-munchie.json').length;
      expect(munchieCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = deriveMunchieCandidates({});
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles null values', () => {
      const result = deriveMunchieCandidates({
        filePath: null,
        modelUrl: null,
        name: null,
        id: null
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles files without extensions', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test' });
      expect(result).toContain('test-munchie.json');
    });

    it('handles double extensions correctly', () => {
      const result = deriveMunchieCandidates({ filePath: 'models/test.backup.3MF' });
      expect(result).toContain('test.backup-munchie.json');
    });
  });

  describe('real-world scenarios', () => {
    it('handles typical Windows upload path with uppercase extension', () => {
      const result = deriveMunchieCandidates({
        filePath: 'uploads\\MyPart.STL'
      });
      expect(result).toContain('uploads/MyPart-stl-munchie.json');
    });

    it('handles model URL from API with uppercase extension', () => {
      const result = deriveMunchieCandidates({
        modelUrl: '/models/folder/Component.3MF'
      });
      expect(result).toContain('folder/Component-munchie.json');
    });

    it('handles complex nested folder structure with mixed case', () => {
      const result = deriveMunchieCandidates({
        filePath: 'models/Projects/2024/December/Part.STL'
      });
      expect(result).toContain('Projects/2024/December/Part-stl-munchie.json');
    });
  });
});
