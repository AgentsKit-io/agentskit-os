/**
 * Renderer component tests.
 *
 * Each renderer is tested for basic render, error states, and key behaviors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockRejectedValue(new Error('Tauri not available')),
}))

// ---------------------------------------------------------------------------
// CodeRenderer
// ---------------------------------------------------------------------------

import { CodeRenderer } from '../renderers/code-renderer'

describe('CodeRenderer', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('renders code content', () => {
    render(<CodeRenderer content="const x = 42" language="ts" />)
    expect(screen.getByText('const x = 42')).toBeInTheDocument()
  })

  it('shows the language label', () => {
    render(<CodeRenderer content="x = 1" language="python" />)
    expect(screen.getByText('python')).toBeInTheDocument()
  })

  it('renders line numbers', () => {
    render(<CodeRenderer content={'line1\nline2\nline3'} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('copy button calls clipboard.writeText', () => {
    render(<CodeRenderer content="hello" />)
    fireEvent.click(screen.getByLabelText('Copy code'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
  })
})

// ---------------------------------------------------------------------------
// JsonRenderer
// ---------------------------------------------------------------------------

import { JsonRenderer } from '../renderers/json-renderer'

describe('JsonRenderer', () => {
  it('renders JSON keys', () => {
    render(<JsonRenderer content='{"name":"Alice","age":30}' />)
    expect(screen.getByText(/"name"/)).toBeInTheDocument()
    expect(screen.getByText(/"age"/)).toBeInTheDocument()
  })

  it('renders JSON arrays as formatted text', () => {
    render(<JsonRenderer content='[1,2,3]' />)
    expect(screen.getByText(/1,/)).toBeInTheDocument()
  })

  it('shows error for invalid JSON', () => {
    render(<JsonRenderer content='{invalid}' />)
    expect(screen.getByText(/invalid json/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// CsvRenderer
// ---------------------------------------------------------------------------

import { CsvRenderer } from '../renderers/csv-renderer'

describe('CsvRenderer', () => {
  it('renders CSV headers', () => {
    render(
      <CsvRenderer
        content={`name,age,city
Alice,30,NY
Bob,25,LA`}
      />,
    )
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
    expect(screen.getByText('city')).toBeInTheDocument()
  })

  it('renders CSV rows', () => {
    render(
      <CsvRenderer
        content={`name,age
Alice,30
Bob,25`}
      />,
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows no-data message for empty content', () => {
    render(<CsvRenderer content="" />)
    expect(screen.getByText(/no csv data/i)).toBeInTheDocument()
  })

  it('renders tab-delimited CSV', () => {
    render(
      <CsvRenderer
        content={`name\tage
Alice\t30`}
      />,
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SvgRenderer
// ---------------------------------------------------------------------------

import { SvgRenderer } from '../renderers/svg-renderer'

describe('SvgRenderer', () => {
  it('renders SVG content', () => {
    const { container } = render(
      <SvgRenderer content='<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>' />,
    )
    expect(container.querySelector('circle')).toBeInTheDocument()
  })

  it('strips script tags from SVG', () => {
    const { container } = render(
      <SvgRenderer content='<svg><script>alert(1)</script><circle r="5"/></svg>' />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('circle')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// MermaidRenderer
// ---------------------------------------------------------------------------

import { MermaidRenderer } from '../renderers/mermaid-renderer'

describe('MermaidRenderer', () => {
  it('shows stub when mermaid global is not available', () => {
    render(<MermaidRenderer content={'```mermaid\ngraph TD\n  A --> B\n```'} />)
    expect(screen.getByText(/pending mermaid\.js load/i)).toBeInTheDocument()
  })

  it('shows source code in stub', () => {
    render(<MermaidRenderer content={'```mermaid\ngraph TD\n  A --> B\n```'} />)
    expect(screen.getByText(/graph TD/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// HtmlRenderer
// ---------------------------------------------------------------------------

import { HtmlRenderer } from '../renderers/html-renderer'

describe('HtmlRenderer', () => {
  it('renders an iframe with sandbox attribute', () => {
    const { container } = render(
      <HtmlRenderer content="<html><body>Hello</body></html>" />,
    )
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts')
  })

  it('sets srcDoc to the content', () => {
    const { container } = render(<HtmlRenderer content="<p>Test</p>" />)
    const iframe = container.querySelector('iframe')
    // Note: React normalizes srcDoc to srcdoc in the DOM
    expect(iframe?.getAttribute('srcdoc')).toBe('<p>Test</p>')
  })
})

// ---------------------------------------------------------------------------
// MarkdownRenderer
// ---------------------------------------------------------------------------

import { MarkdownRenderer } from '../renderers/markdown-renderer'

describe('MarkdownRenderer', () => {
  it('renders markdown headings', () => {
    const { container } = render(<MarkdownRenderer content="# Hello World" />)
    expect(container.querySelector('h1')).toBeInTheDocument()
  })

  it('renders paragraphs', () => {
    const { container } = render(<MarkdownRenderer content="Simple paragraph text." />)
    expect(container.querySelector('p')).toBeInTheDocument()
  })

  it('renders bold text', () => {
    const { container } = render(<MarkdownRenderer content="This is **bold**." />)
    expect(container.querySelector('strong')).toBeInTheDocument()
  })

  it('escapes HTML in user content', () => {
    const { container } = render(<MarkdownRenderer content="<script>alert(1)</script>" />)
    expect(container.querySelector('script')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ImageRenderer
// ---------------------------------------------------------------------------

import { ImageRenderer } from '../renderers/image-renderer'

describe('ImageRenderer', () => {
  it('renders a data URL image', () => {
    const { container } = render(
      <ImageRenderer content="data:image/png;base64,abc123" name="test.png" />,
    )
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.src).toContain('data:image/png;base64')
  })

  it('renders an https image URL', () => {
    const { container } = render(
      <ImageRenderer content="https://example.com/photo.jpg" />,
    )
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('shows error for http (non-TLS) URL', () => {
    render(<ImageRenderer content="http://example.com/photo.jpg" />)
    expect(screen.getByText(/non-TLS/i)).toBeInTheDocument()
  })

  it('shows error for unsupported scheme', () => {
    render(<ImageRenderer content="ftp://example.com/photo.jpg" />)
    expect(screen.getByText(/unsupported image source/i)).toBeInTheDocument()
  })
})
