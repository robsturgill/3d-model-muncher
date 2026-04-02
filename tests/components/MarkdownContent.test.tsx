// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { MarkdownContent } from '../../src/components/MarkdownContent'

function getContent() {
  return screen.getByTestId('markdown-content')
}

describe('MarkdownContent', () => {
  it('renders plain text unchanged', () => {
    render(<MarkdownContent content="Hello world" />)
    expect(within(getContent()).getByText('Hello world')).toBeInTheDocument()
  })

  it('renders bold text as <strong>', () => {
    render(<MarkdownContent content="**bold text**" />)
    const el = within(getContent()).getByText('bold text')
    expect(el.tagName).toBe('STRONG')
  })

  it('renders italic text as <em>', () => {
    render(<MarkdownContent content="*italic text*" />)
    const el = within(getContent()).getByText('italic text')
    expect(el.tagName).toBe('EM')
  })

  it('renders h1 heading', () => {
    render(<MarkdownContent content="# My Heading" />)
    const el = within(getContent()).getByText('My Heading')
    expect(el.tagName).toBe('H1')
  })

  it('renders h2 heading', () => {
    render(<MarkdownContent content="## Sub Heading" />)
    const el = within(getContent()).getByText('Sub Heading')
    expect(el.tagName).toBe('H2')
  })

  it('renders h3 heading', () => {
    render(<MarkdownContent content="### Small Heading" />)
    const el = within(getContent()).getByText('Small Heading')
    expect(el.tagName).toBe('H3')
  })

  it('renders unordered list items', () => {
    render(<MarkdownContent content={'- Alpha\n- Beta\n- Gamma'} />)
    const content = getContent()
    expect(within(content).getByText('Alpha')).toBeInTheDocument()
    expect(within(content).getByText('Beta')).toBeInTheDocument()
    expect(within(content).getByText('Gamma')).toBeInTheDocument()
    expect(content.querySelector('ul')).toBeInTheDocument()
  })

  it('renders ordered list as <ol>', () => {
    render(<MarkdownContent content={'1. First\n2. Second'} />)
    const content = getContent()
    expect(within(content).getByText('First')).toBeInTheDocument()
    expect(content.querySelector('ol')).toBeInTheDocument()
  })

  it('renders inline code as <code>', () => {
    render(<MarkdownContent content="Use `npm install` to install" />)
    const el = within(getContent()).getByText('npm install')
    expect(el.tagName).toBe('CODE')
  })

  it('renders blockquote', () => {
    render(<MarkdownContent content="> A quoted passage" />)
    const content = getContent()
    expect(content.querySelector('blockquote')).toBeInTheDocument()
    expect(within(content).getByText('A quoted passage')).toBeInTheDocument()
  })

  it('renders links with safe rel and target attributes', () => {
    render(<MarkdownContent content="[Click here](https://example.com)" />)
    const link = within(getContent()).getByText('Click here').closest('a')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not render raw HTML tags as elements', () => {
    // react-markdown does not enable rehype-raw, so <b>text</b> must not
    // produce a <b> element in the DOM
    render(<MarkdownContent content="<b>should not be bold</b>" />)
    expect(getContent().querySelector('b')).toBeNull()
  })

  it('applies className to the wrapper element', () => {
    render(<MarkdownContent content="text" className="my-custom-class" />)
    expect(getContent()).toHaveClass('my-custom-class')
  })

  it('renders multiple paragraphs', () => {
    render(<MarkdownContent content={'First paragraph.\n\nSecond paragraph.'} />)
    const content = getContent()
    expect(within(content).getByText('First paragraph.')).toBeInTheDocument()
    expect(within(content).getByText('Second paragraph.')).toBeInTheDocument()
  })
})
