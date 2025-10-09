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

  it('button reads "View 2 models"', () => {
    render(<CollectionCard {...base()} />)
    expect(screen.getByRole('button', { name: /view 2 models/i })).toBeTruthy()
  })
})
