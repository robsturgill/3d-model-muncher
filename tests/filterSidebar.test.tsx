// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock the local UI Select module used by FilterSidebar to a simple <select>
vi.mock('../src/components/ui/select', () => {
  const React = require('react') as typeof import('react')
  return {
    Select: ({ children, value, onValueChange, ...rest }: any) => (
      React.createElement(
        'div',
        {
          'data-testid': 'mock-select-wrapper',
          'data-select-value': value,
        },
        children,
      )
    ),
    // Return null for wrapper components to keep DOM structure simple
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: (props: any) => React.createElement(React.Fragment, null, props.children),
    SelectItem: ({ value, children, ...rest }: any) => React.createElement('option', { value, ...rest }, children),
    SelectLabel: () => null,
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  }
})

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

    // Verify the Sort By label is present
    expect(getByText('Sort By')).toBeDefined();

    // Verify that the sort select is initialized with the correct value
    // The Select component is mocked to render a div with data-select-value attribute
    const selectWrappers = getAllByTestId('mock-select-wrapper');
    // Find the wrapper with the sort value 'modified_desc'
    const selectValues = selectWrappers.map((w) => w.getAttribute('data-select-value'));
    expect(selectValues).toContain('modified_desc');
  });
});
