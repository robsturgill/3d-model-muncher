/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { normalizeModelPath, extractFileName } from '../src/utils/downloadUtils';

describe('downloadUtils helpers', () => {
  it('normalizeModelPath handles backslashes and missing /models prefix', () => {
    expect(normalizeModelPath('models/sub/file.stl')).toBe('/models/sub/file.stl');
    expect(normalizeModelPath('/models/sub/file.stl')).toBe('/models/sub/file.stl');
    expect(normalizeModelPath('sub\\dir\\file.3mf')).toBe('/models/sub/dir/file.3mf');
    expect(normalizeModelPath('C:\\abs\\path\\file.stl')).toBe('/models/C:/abs/path/file.stl'.replace(/\\/g, '/'));
  });

  it('extractFileName returns basename for both slash types', () => {
    expect(extractFileName('/models/sub/file.stl')).toBe('file.stl');
    expect(extractFileName('models\\sub\\file.stl')).toBe('file.stl');
    expect(extractFileName('fileOnly.3mf')).toBe('fileOnly.3mf');
    expect(extractFileName('')).toBe('');
    expect(extractFileName(null)).toBe('');
  });
});
