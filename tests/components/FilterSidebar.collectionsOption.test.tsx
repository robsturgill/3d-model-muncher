// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'

// Mock the local UI Select module used by FilterSidebar to a simple <select>
vi.mock('../../src/components/ui/select', () => {
  const React = require('react') as typeof import('react')
  
  return {
    Select: ({ children, value, onValueChange, ...rest }: any) => {
      // Find the SelectTrigger child to extract data-testid
      let testId: string | undefined
      React.Children.forEach(children, (child: any) => {
        if (child?.type?.name === 'SelectTrigger' || child?.props?.['data-testid']) {
          testId = child.props?.['data-testid']
        }
      })
      
      return React.createElement(
        'select',
        {
          'data-testid': testId,
          value,
          onChange: (e: any) => onValueChange && onValueChange(e.target.value),
          ...rest,
        },
        children,
      )
    },
    // Store the testId in props for Select to access
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

import { FilterSidebar } from '../../src/components/FilterSidebar'

describe('FilterSidebar file type includes Collections', () => {
  const categories = [{ id: 'cat1', label: 'Organizers', icon: 'Folder' }] as any
  const models = [] as any

  it('shows Collections option and triggers onFilterChange with fileType collections', async () => {
    const onFilterChange = vi.fn()
    render(
      <FilterSidebar
        onFilterChange={onFilterChange}
        onCategoryChosen={() => {}}
        isOpen
        onClose={() => {}}
        onSettingsClick={() => {}}
        categories={categories}
        models={models}
        initialFilters={{ search: '', category: 'all', printStatus: 'all', license: 'all', fileType: 'all', tags: [], showHidden: false, showMissingImages: false }}
      />
    )

  // Change the mocked File Type select to "collections"
  const fileTypeSelect = screen.getByTestId('filter-file-type-select') as HTMLSelectElement
  fireEvent.change(fileTypeSelect, { target: { value: 'collections' } })

    // Called with a filter object containing fileType: 'collections'
    expect(onFilterChange).toHaveBeenCalled()
    const last = onFilterChange.mock.calls.at(-1)?.[0]
    expect(last?.fileType).toBe('collections')
  })
})
