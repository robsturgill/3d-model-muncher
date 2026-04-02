// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React, { useState } from 'react'
import { MarkdownEditor } from '../../src/components/MarkdownEditor'

function Host(props: {
  initial?: string
  rows?: number
  placeholder?: string
  onChange?: (v: string) => void
}) {
  const [value, setValue] = useState(props.initial ?? '')
  return (
    <MarkdownEditor
      value={value}
      onChange={(v) => { setValue(v); props.onChange?.(v) }}
      rows={props.rows}
      placeholder={props.placeholder}
    />
  )
}

describe('MarkdownEditor', () => {
  it('renders Edit and Preview tab buttons', () => {
    render(<Host />)
    expect(screen.getByTestId('markdown-editor-edit-tab')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-editor-preview-tab')).toBeInTheDocument()
  })

  it('shows textarea by default (edit mode)', () => {
    render(<Host initial="some content" />)
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toBe('some content')
  })

  it('does not show preview panel in edit mode', () => {
    render(<Host />)
    expect(screen.queryByTestId('markdown-editor-preview')).toBeNull()
  })

  it('calls onChange when textarea value changes', () => {
    const onChange = vi.fn()
    render(<Host onChange={onChange} />)
    fireEvent.change(screen.getByTestId('markdown-editor-textarea'), { target: { value: 'new text' } })
    expect(onChange).toHaveBeenCalledWith('new text')
  })

  it('switching to Preview hides the textarea', () => {
    render(<Host initial="**bold**" />)
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    expect(screen.queryByTestId('markdown-editor-textarea')).toBeNull()
    expect(screen.getByTestId('markdown-editor-preview')).toBeInTheDocument()
  })

  it('Preview renders markdown content', () => {
    render(<Host initial="**bold text**" />)
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    const preview = screen.getByTestId('markdown-editor-preview')
    const bold = within(preview).getByText('bold text')
    expect(bold.tagName).toBe('STRONG')
  })

  it('shows empty placeholder when value is empty in preview mode', () => {
    render(<Host initial="" />)
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    expect(screen.getByTestId('markdown-editor-empty')).toBeInTheDocument()
  })

  it('shows empty placeholder when value is whitespace-only in preview mode', () => {
    render(<Host initial="   " />)
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    expect(screen.getByTestId('markdown-editor-empty')).toBeInTheDocument()
  })

  it('switching back to Edit from Preview restores the textarea', () => {
    render(<Host initial="hello" />)
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    fireEvent.click(screen.getByTestId('markdown-editor-edit-tab'))
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('hello')
  })

  it('forwards placeholder to the textarea', () => {
    render(<Host placeholder="Write something..." />)
    expect(screen.getByTestId('markdown-editor-textarea')).toHaveAttribute('placeholder', 'Write something...')
  })

  it('preview reflects edits made before switching tabs', () => {
    render(<Host initial="original" />)
    fireEvent.change(screen.getByTestId('markdown-editor-textarea'), { target: { value: '*updated*' } })
    fireEvent.click(screen.getByTestId('markdown-editor-preview-tab'))
    const preview = screen.getByTestId('markdown-editor-preview')
    const el = within(preview).getByText('updated')
    expect(el.tagName).toBe('EM')
  })
})
