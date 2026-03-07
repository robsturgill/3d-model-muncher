// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { SelectionModeControls } from '../../src/components/SelectionModeControls'

const renderComponent = (props: Partial<React.ComponentProps<typeof SelectionModeControls>> = {}) => {
  return render(
    <SelectionModeControls
      isSelectionMode={false}
      selectedCount={0}
      {...props}
    />
  )
}

describe('SelectionModeControls', () => {
  it('shows select button when not in selection mode and calls handler on click', async () => {
    const user = userEvent.setup()
    const onEnterSelectionMode = vi.fn()
    renderComponent({ onEnterSelectionMode, selectLabel: 'Select models' })

    const selectButton = screen.getByTestId('selection-mode-enter-button')
    await user.click(selectButton)

    expect(onEnterSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('renders bulk actions when selection mode is active with selections and fires handlers', async () => {
    const onBulkEdit = vi.fn()
    const onCreateCollection = vi.fn()
  const onBulkDelete = vi.fn()
    const onSelectAll = vi.fn()
    const onDeselectAll = vi.fn()
    const onExitSelectionMode = vi.fn()

    const user = userEvent.setup()
    renderComponent({
      isSelectionMode: true,
      selectedCount: 3,
      onBulkEdit,
      onCreateCollection,
      onBulkDelete,
      onSelectAll,
      onDeselectAll,
      onExitSelectionMode,
    })

  expect(screen.getByText('3 selected')).toBeInTheDocument()

  await user.click(screen.getByTestId('selection-mode-edit-button'))
  await user.click(screen.getByTestId('selection-mode-collection-button'))
  await user.click(screen.getByTestId('selection-mode-delete-button'))
  await user.click(screen.getByTitle('Select all visible models'))
  await user.click(screen.getByTitle('Deselect all models'))
  await user.click(screen.getByTestId('selection-mode-exit-button'))

    expect(onBulkEdit).toHaveBeenCalledTimes(1)
    expect(onCreateCollection).toHaveBeenCalledTimes(1)
    expect(onBulkDelete).toHaveBeenCalledTimes(1)
    expect(onSelectAll).toHaveBeenCalledTimes(1)
    expect(onDeselectAll).toHaveBeenCalledTimes(1)
    expect(onExitSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('hides bulk actions when nothing is selected', () => {
    const { container } = renderComponent({ isSelectionMode: true, selectedCount: 0 })
    const scope = within(container)

    expect(scope.getByText('0 selected')).toBeInTheDocument()
    expect(scope.queryByRole('button', { name: /edit/i })).toBeNull()
    expect(scope.queryByRole('button', { name: /collection/i })).toBeNull()
    expect(scope.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('disables select all buttons when handlers are missing', () => {
    const { container } = renderComponent({ isSelectionMode: true, selectedCount: 1 })
    const scope = within(container)

    scope.getAllByTitle('Select all visible models').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
    scope.getAllByTitle('Deselect all models').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
