import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FilterSidebar } from '../src/components/FilterSidebar';
import type { Category } from '../src/types/category';
import type { Model } from '../src/types/model';

const categories: Category[] = [
  { id: 'all', label: 'All', icon: 'Folder' },
  { id: 'utility', label: 'Utility', icon: 'Wrench' },
];

const models: Model[] = [
  { id: 'm1', name: 'A Thing', tags: ['tag1'], category: 'Utility', modelUrl: '/models/a.3mf', fileType: '3mf', isPrinted: false } as any,
];

describe('FilterSidebar sort initialization', () => {
  beforeAll(() => {
    // Ensure a DOM is available even when running this test file alone
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;
  });
  it('renders Sort By label and accepts initialFilters.sortBy', () => {
    const onFilterChange = vi.fn();

    const { getByText, getAllByTestId } = render(
      <FilterSidebar
        onFilterChange={onFilterChange}
        onSettingsClick={() => {}}
        onClose={() => {}}
        isOpen={true}
        categories={categories}
        models={models}
        initialFilters={{
          search: '',
          category: 'all',
          printStatus: 'all',
          license: 'all',
          fileType: 'all',
          tags: [],
          showHidden: false,
          showMissingImages: false,
          sortBy: 'modified_desc',
        }}
      />
    );

    // Verify the Sort By label is present (basic sanity check)
    expect(getByText('Sort By')).toBeDefined();

    // Interaction with the Select is provided by the ui/select component.
    // Here we only assert basic render without crashing and label presence.
  });
});
