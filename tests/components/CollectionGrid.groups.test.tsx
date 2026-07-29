// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import CollectionGrid from '../../src/components/CollectionGrid'

describe('CollectionGrid groups', () => {
  const models = [
    {
      id: 'm1',
      name: 'Dragon Small',
      category: 'Figures',
      tags: ['small'],
      isPrinted: false,
      printTime: '',
      filamentUsed: '',
      fileSize: '',
      description: '',
      modelUrl: '/models/m1.3mf',
      license: '',
      filePath: '/tmp/m1.3mf',
      printSettings: { layerHeight: '', infill: '', nozzle: '' },
    },
    {
      id: 'm2',
      name: 'Dragon Large',
      category: 'Figures',
      tags: ['large'],
      isPrinted: false,
      printTime: '',
      filamentUsed: '',
      fileSize: '',
      description: '',
      modelUrl: '/models/m2.3mf',
      license: '',
      filePath: '/tmp/m2.3mf',
      printSettings: { layerHeight: '', infill: '', nozzle: '' },
    },
    {
      id: 'm3',
      name: 'Standalone Vase',
      category: 'Decor',
      tags: [],
      isPrinted: false,
      printTime: '',
      filamentUsed: '',
      fileSize: '',
      description: '',
      modelUrl: '/models/m3.3mf',
      license: '',
      filePath: '/tmp/m3.3mf',
      printSettings: { layerHeight: '', infill: '', nozzle: '' },
    },
  ] as any

  it('renders group cards and reveals grouped models when expanded', () => {
    render(
      <CollectionGrid
        name="Favorites"
        modelIds={['m1', 'm2', 'm3']}
        models={models}
        onBack={vi.fn()}
        onModelClick={vi.fn()}
        activeCollection={{
          id: 'col-1',
          name: 'Favorites',
          modelIds: ['m1', 'm2', 'm3'],
          groups: [
            { id: 'grp-1', name: 'Dragon Model', description: 'Scaled variants', modelIds: ['m1', 'm2'] },
          ],
        }}
      />
    )

    expect(screen.getByText('Groups')).toBeInTheDocument()
    expect(screen.getByText('Dragon Model')).toBeInTheDocument()
    expect(screen.getByText('Standalone Vase')).toBeInTheDocument()
    expect(screen.queryByText('Dragon Small')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dragon model/i }))

    expect(screen.getByText('Dragon Small')).toBeInTheDocument()
    expect(screen.getByText('Dragon Large')).toBeInTheDocument()
  })

  it('offers both collection and group actions on a selection', () => {
    render(
      <CollectionGrid
        name="Favorites"
        modelIds={['m1', 'm2', 'm3']}
        models={models}
        onBack={vi.fn()}
        onModelClick={vi.fn()}
        isSelectionMode
        selectedModelIds={['m1']}
        onToggleSelectionMode={vi.fn()}
        activeCollection={{ id: 'col-1', name: 'Favorites', modelIds: ['m1', 'm2', 'm3'], groups: [] }}
      />
    )

    // Grouping was added alongside collection creation, not in place of it:
    // moving a selection into another collection has to stay reachable here.
    expect(screen.getByTestId('selection-mode-collection-button')).toBeInTheDocument()
    expect(screen.getByTestId('selection-mode-group-button')).toBeInTheDocument()
  })

  it('keeps an emptied group visible so it can still be renamed or ungrouped', () => {
    render(
      <CollectionGrid
        name="Favorites"
        modelIds={['m3']}
        models={models}
        onBack={vi.fn()}
        onModelClick={vi.fn()}
        activeCollection={{
          id: 'col-1',
          name: 'Favorites',
          modelIds: ['m3'],
          groups: [{ id: 'grp-1', name: 'Dragon Model', description: '', modelIds: [] }],
        }}
      />
    )

    expect(screen.getByText('Dragon Model')).toBeInTheDocument()
    expect(screen.getByText(/no variants yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /group actions/i })).toBeInTheDocument()
  })
})
