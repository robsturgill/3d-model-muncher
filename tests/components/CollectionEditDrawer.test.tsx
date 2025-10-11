// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import CollectionEditDrawer from '../../src/components/CollectionEditDrawer'

describe('CollectionEditDrawer', () => {
  beforeEach(() => {
    // Reset fetch between tests
    // @ts-ignore
    global.fetch = undefined
  })

  const baseRender = (overrides: Partial<React.ComponentProps<typeof CollectionEditDrawer>> = {}) => {
    const onOpenChange = vi.fn()
    const onSaved = vi.fn()
    const categories = [{ id: 'cat1', label: 'Organizers', icon: 'Folder' } as any]
    render(
      <CollectionEditDrawer
        open
        onOpenChange={onOpenChange}
        collection={null}
        categories={categories}
        initialModelIds={['m1', 'm2']}
        onSaved={onSaved}
        {...overrides}
      />
    )
    return { onOpenChange, onSaved }
  }

  it('defaults to "Uncategorized" category on save when not selected (create mode)', async () => {
    const { onSaved } = baseRender()
    fireEvent.change(screen.getByPlaceholderText('Collection name'), { target: { value: 'Desk Set' } })
    // default category is 'Uncategorized' if nothing selected
    // mock fetch
    const mockRes = { ok: true, json: () => Promise.resolve({ success: true, collection: { id: 'c1' } }) }
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue(mockRes)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(global.fetch).toHaveBeenCalled()
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(body.category).toBe('Uncategorized')
    expect(body.modelIds).toEqual(['m1', 'm2'])
  })

  it('clicking overlay does not close the drawer or leak events', async () => {
    const { onOpenChange } = baseRender()
    const overlay = document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement
    if (!overlay) throw new Error('Overlay not found')
    fireEvent.mouseDown(overlay)
    fireEvent.click(overlay)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('Add tag updates list and keeps drawer open', async () => {
    const { onOpenChange } = baseRender()
    const tagInputs = screen.getAllByPlaceholderText('Add tag')
    const tagInput = tagInputs[0]
    fireEvent.change(tagInput, { target: { value: 'newtag' } })
    // Use keyboard interaction to add the tag to avoid any pointer-events quirks
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })
    const tagBadges = await screen.findAllByText((content, node) => {
      const text = (node?.textContent || '').toLowerCase()
      return text.includes('newtag')
    })
    expect(tagBadges.length).toBeGreaterThan(0)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('shows removal banner and removes intersecting models from the collection', async () => {
    const removalCollection = {
      id: 'col-1',
      name: 'Office Picks',
      description: '',
      category: 'Organizers',
      tags: [],
      images: [],
      modelIds: ['m1', 'm2', 'm3'],
      coverModelId: null,
    }

    const { onSaved } = baseRender({
      initialModelIds: ['m1', 'm3'],
      removalCollection: removalCollection as any,
    })

    const banner = await screen.findByText((content) => content.includes('Remove 2 items from "Office Picks".'))
    expect(banner).toBeInTheDocument()

    const removeButton = screen.getByRole('button', { name: /remove selected from collection/i })
    expect(removeButton).toBeEnabled()

    const mockRes = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        collection: { ...removalCollection, modelIds: ['m2'] },
      }),
    }
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue(mockRes)

    fireEvent.click(removeButton)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(body.id).toBe('col-1')
    expect(body.modelIds).toEqual(['m2'])
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ modelIds: ['m2'] }))
  })
})
