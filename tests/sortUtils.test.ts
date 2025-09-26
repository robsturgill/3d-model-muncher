import { describe, it, expect } from 'vitest';
import { sortModels } from '../src/utils/sortUtils';

const models = [
  { id: 'a', name: 'Alpha', lastModified: '2025-09-24T12:00:00.000Z' },
  { id: 'b', name: 'Bravo', lastModified: '2025-09-25T09:00:00.000Z' },
  { id: 'c', name: 'Charlie', lastModified: '2025-09-23T18:30:00.000Z' },
  { id: 'd', name: 'Delta' } // no timestamp
];

describe('sortModels', () => {
  it('sorts by modified_desc (newest first)', () => {
    const sorted = sortModels(models, 'modified_desc');
    expect(sorted.map(m => m.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('sorts by modified_asc (oldest first)', () => {
    const sorted = sortModels(models, 'modified_asc');
    expect(sorted.map(m => m.id)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('sorts by name_asc', () => {
    const sorted = sortModels(models, 'name_asc');
    expect(sorted.map(m => m.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts by name_desc', () => {
    const sorted = sortModels(models, 'name_desc');
    expect(sorted.map(m => m.id)).toEqual(['d', 'c', 'b', 'a']);
  });
});
