// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { CollectionCard } from '../../src/components/CollectionCard'

describe('CollectionCard', () => {
  const base = (overrides: any = {}) => ({
    collection: { id: 'c1', name: 'Stuff', modelIds: ['m1','m2'], images: [], description: 'desc', category: 'Organizers' },
    categories: [],
    onOpen: () => {},
    ...overrides
  })

  it('shows cover image when images exist', () => {
    render(<CollectionCard {...base({ collection: { id: 'c', name: 'Has image', modelIds: [], images: ['data:image/png;base64,abc'] } })} />)
    expect(screen.getByAltText(/has image/i)).toBeTruthy()
  })

  it('prefers a user-uploaded cover over the generated collage', () => {
    const models = [
      { id: 'm1', name: 'One', parsedImages: ['data:image/png;base64,thumb1'] },
      { id: 'm2', name: 'Two', parsedImages: ['data:image/png;base64,thumb2'] },
    ] as any
    render(<CollectionCard {...base({
      collection: { id: 'c', name: 'Custom cover', modelIds: ['m1', 'm2'], images: ['data:image/png;base64,chosen'] },
      models,
    })} />)

    const cover = screen.getByAltText(/custom cover/i) as HTMLImageElement
    expect(cover.src).toContain('chosen')
    // The collage would render several tiles; the chosen cover renders exactly one image.
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('falls back to a collage of member thumbnails when no cover is set', () => {
    const models = [
      { id: 'm1', name: 'One', parsedImages: ['data:image/png;base64,thumb1'] },
      { id: 'm2', name: 'Two', parsedImages: ['data:image/png;base64,thumb2'] },
    ] as any
    render(<CollectionCard {...base({
      collection: { id: 'c', name: 'No cover', modelIds: ['m1', 'm2'], images: [] },
      models,
    })} />)

    const images = screen.getAllByRole('img') as HTMLImageElement[]
    expect(images).toHaveLength(2)
    expect(images[0].src).toContain('thumb1')
  })

  it('button reads "View 2 models"', () => {
    render(<CollectionCard {...base()} />)
    expect(screen.getByRole('button', { name: /view 2 models/i })).toBeTruthy()
  })
})
