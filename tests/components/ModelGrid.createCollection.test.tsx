// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ModelGrid } from '../../src/components/ModelGrid'

describe('ModelGrid create collection flow', () => {
  const models = [{ id: 'm1', name: 'Model 1', category: 'Organizers', tags: [], isPrinted: false }] as any
  it('opens CollectionEditDrawer when clicking Collection in selection mode', () => {
    const onToggleSelectionMode = vi.fn()
    render(
      <ModelGrid
        models={models}
        collections={[]}
        onModelClick={() => {}}
        onToggleSelectionMode={onToggleSelectionMode}
        isSelectionMode
        selectedModelIds={["m1"]}
      />
    )
    // Click the Collection button
    fireEvent.click(screen.getByRole('button', { name: /collection/i }))
    // Drawer content should appear
    expect(screen.getByText(/new collection/i)).toBeTruthy()
  })
})
