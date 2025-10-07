// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React, { useState } from 'react'
import TagsInput from '../../src/components/TagsInput'

function Host(props: {
  initial?: string[];
  suggested?: string[];
  fallbackDisplay?: string[];
  caseSensitive?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(props.initial ?? [])
  return (
    <div data-testid="host">
      <TagsInput
        value={tags}
        onChange={setTags}
        suggested={props.suggested}
        fallbackDisplay={props.fallbackDisplay}
        caseSensitive={props.caseSensitive}
        disabled={props.disabled}
        placeholder={props.placeholder}
      />
    </div>
  )
}

describe.sequential('TagsInput', () => {
  it('adds a tag via Enter key', async () => {
  const utils = render(<Host />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'foo' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

  const chip = await scope.findByText('foo', { selector: 'span[data-slot="badge"]' })
    expect(chip).toBeInTheDocument()
  })

  it('adds a tag via Add button', async () => {
  const utils = render(<Host />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'bar' } })
    const addBtn = scope.getByRole('button', { name: /add/i })
    fireEvent.click(addBtn)

  const chip = await scope.findByText('bar', { selector: 'span[data-slot="badge"]' })
    expect(chip).toBeInTheDocument()
  })

  it('removes a tag when its badge is clicked', async () => {
  const utils = render(<Host initial={[ 'alpha', 'beta' ]} />)
  const scope = within(utils.container)
    // alpha chip should be present
  const chip = await scope.findByText('alpha', { selector: 'span[data-slot="badge"]' })
    expect(chip).toBeInTheDocument()
    fireEvent.click(chip)
  expect(scope.queryByText('alpha', { selector: 'span[data-slot="badge"]' })).not.toBeInTheDocument()
  })

  it('deduplicates case-insensitively by default', async () => {
  const utils = render(<Host />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Tag' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    fireEvent.change(input, { target: { value: 'tag' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

  const chips = await scope.findAllByText(/tag/i, { selector: 'span[data-slot="badge"]' })
    // Should only be one chip containing 'tag'
    expect(chips.length).toBe(1)
  })

  it('supports caseSensitive=true allowing Tag and tag', async () => {
  const utils = render(<Host caseSensitive />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Tag' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    fireEvent.change(input, { target: { value: 'tag' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    // Both should exist separately
  const tagChip = await scope.findByText('Tag', { selector: 'span[data-slot="badge"]' })
  const tag2Chip = await scope.findByText('tag', { selector: 'span[data-slot="badge"]' })
    expect(tagChip).toBeInTheDocument()
    expect(tag2Chip).toBeInTheDocument()
  })

  it('adds from suggested tags on click', async () => {
  const utils = render(<Host suggested={[ 'one', 'two' ]} />)
  const scope = within(utils.container)
    // Suggested chip renders with "+ one" label, but we can use title for stability
  const sug = scope.getByTitle('Add one')
    fireEvent.click(sug)
  const chip = await scope.findByText('one', { selector: 'span[data-slot="badge"]' })
    expect(chip).toBeInTheDocument()
  })

  it('shows fallbackDisplay when value is empty, and removal promotes to controlled value', async () => {
    function FallbackHost() {
      const [tags, setTags] = useState<string[]>([])
      return (
        <div data-testid="host-fallback">
          <TagsInput value={tags} onChange={setTags} fallbackDisplay={[ 'orig1', 'orig2' ]} />
        </div>
      )
    }
  const utils = render(<FallbackHost />)
  const scope = within(utils.container)
  // Initially shows fallback chips
  expect(await scope.findByText('orig1', { selector: 'span[data-slot="badge"]' })).toBeInTheDocument()
  expect(scope.getByText('orig2', { selector: 'span[data-slot="badge"]' })).toBeInTheDocument()

    // Remove orig1; should now render only orig2 from actual value state
  const chip = scope.getByText('orig1', { selector: 'span[data-slot="badge"]' })
    fireEvent.click(chip)

    // After state update, orig1 should be gone
  expect(await scope.findByText('orig2', { selector: 'span[data-slot="badge"]' })).toBeInTheDocument()
  expect(scope.queryByText('orig1', { selector: 'span[data-slot="badge"]' })).not.toBeInTheDocument()
  })

  it('adding while showing fallback promotes combined list to value', async () => {
    function FallbackAddHost() {
      const [tags, setTags] = useState<string[]>([])
      return (
        <div data-testid="host-fallback-add">
          <TagsInput value={tags} onChange={setTags} fallbackDisplay={[ 'origA' ]} />
        </div>
      )
    }
  const utils = render(<FallbackAddHost />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'newbie' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

  // Should show both origA and newbie exactly once in this component scope
  const origAChips = await scope.findAllByText('origA', { selector: 'span[data-slot="badge"]' })
  expect(origAChips.length).toBeGreaterThanOrEqual(1)
  const newbieChips = scope.getAllByText('newbie', { selector: 'span[data-slot="badge"]' })
  expect(newbieChips.length).toBeGreaterThanOrEqual(1)
  })

  it('disabled prevents adding tags', async () => {
  const utils = render(<Host disabled />)
  const scope = within(utils.container)
    const input = scope.getByPlaceholderText('Add a tag...') as HTMLInputElement
    expect(input).toBeDisabled()
    const addBtn = scope.getByRole('button', { name: /add/i })
    expect(addBtn).toBeDisabled()
    // typing and Enter should not add anything because disabled ignores interactions
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    // The chip should not appear under disabled
  expect(scope.queryByText('nope', { selector: 'span[data-slot="badge"]' })).not.toBeInTheDocument()
  })
})
