/**
 * Tests for CustomWidgetRenderer and getPath helper.
 *
 * Covers:
 *   - getPath: basic dot-notation resolution
 *   - getPath: empty path returns root object
 *   - getPath: missing segment returns undefined
 *   - CustomWidgetRenderer renders loading state initially
 *   - CustomWidgetRenderer renders value for 'number' kind
 *   - CustomWidgetRenderer renders sparkline for 'sparkline' kind
 *   - CustomWidgetRenderer renders gauge for 'gauge' kind
 *   - CustomWidgetRenderer renders text for 'text' kind
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { getPath, CustomWidgetRenderer } from '../custom-widget-renderer'
import type { CustomWidget } from '../custom-widget-types'

// ---------------------------------------------------------------------------
// Mock @agentskit/os-ui
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  Card: ({ children, ...p }: { children: React.ReactNode; [k: string]: unknown }) =>
    createElement('div', p, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', {}, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('p', {}, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', {}, children),
}))

// ---------------------------------------------------------------------------
// Mock sidecar
// ---------------------------------------------------------------------------

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: vi.fn(),
}))

import { sidecarRequest } from '../../../lib/sidecar'

const mockSidecarRequest = vi.mocked(sidecarRequest)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWidget(overrides?: Partial<CustomWidget>): CustomWidget {
  return {
    id: 'cw-1',
    title: 'My Widget',
    kind: 'number',
    source: { method: 'metrics.test', pollMs: 60000 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getPath tests
// ---------------------------------------------------------------------------

describe('getPath', () => {
  it('resolves a simple key', () => {
    expect(getPath({ a: 1 }, 'a')).toBe(1)
  })

  it('resolves a nested path', () => {
    expect(getPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for missing segment', () => {
    expect(getPath({ a: 1 }, 'a.b')).toBeUndefined()
  })

  it('returns root object for empty path', () => {
    const obj = { x: 1 }
    expect(getPath(obj, '')).toBe(obj)
  })

  it('returns undefined when traversing through null', () => {
    expect(getPath({ a: null }, 'a.b')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// CustomWidgetRenderer tests
// ---------------------------------------------------------------------------

describe('CustomWidgetRenderer', () => {
  it('renders the widget title', async () => {
    mockSidecarRequest.mockResolvedValue({})
    render(<CustomWidgetRenderer widget={makeWidget()} />)
    expect(screen.getByText('My Widget')).toBeInTheDocument()
  })

  it('renders loading state before fetch resolves', () => {
    // Never resolve
    mockSidecarRequest.mockReturnValue(new Promise(() => undefined))
    render(<CustomWidgetRenderer widget={makeWidget()} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders a number value with format', async () => {
    mockSidecarRequest.mockResolvedValue({ total: 1.2345 })
    const widget = makeWidget({
      kind: 'number',
      source: { method: 'metrics.test', pathExpr: 'total', pollMs: 60000 },
      format: { prefix: '$', precision: 2 },
    })
    render(<CustomWidgetRenderer widget={widget} />)
    await waitFor(() => {
      expect(screen.getByTestId('custom-widget-value')).toHaveTextContent('$1.23')
    })
  })

  it('renders sparkline for sparkline kind', async () => {
    mockSidecarRequest.mockResolvedValue(42)
    const widget = makeWidget({
      kind: 'sparkline',
      source: { method: 'metrics.test', pollMs: 60000 },
    })
    render(<CustomWidgetRenderer widget={widget} />)
    await waitFor(() => {
      expect(screen.getByTestId('sparkline')).toBeInTheDocument()
    })
  })

  it('renders gauge for gauge kind', async () => {
    mockSidecarRequest.mockResolvedValue({ rate: 75 })
    const widget = makeWidget({
      kind: 'gauge',
      source: { method: 'metrics.test', pathExpr: 'rate', pollMs: 60000 },
    })
    render(<CustomWidgetRenderer widget={widget} />)
    await waitFor(() => {
      expect(screen.getByTestId('gauge')).toBeInTheDocument()
    })
  })

  it('renders text for text kind', async () => {
    mockSidecarRequest.mockResolvedValue({ msg: 'healthy' })
    const widget = makeWidget({
      kind: 'text',
      source: { method: 'metrics.test', pathExpr: 'msg', pollMs: 60000 },
    })
    render(<CustomWidgetRenderer widget={widget} />)
    await waitFor(() => {
      expect(screen.getByTestId('custom-widget-value')).toHaveTextContent('healthy')
    })
  })

  it('renders an error message when fetch rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('Connection failed'))
    render(<CustomWidgetRenderer widget={makeWidget()} />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
    })
  })

  it('renders dash for undefined value', async () => {
    mockSidecarRequest.mockResolvedValue({})
    const widget = makeWidget({
      kind: 'number',
      source: { method: 'metrics.test', pathExpr: 'missing', pollMs: 60000 },
    })
    render(<CustomWidgetRenderer widget={widget} />)
    await waitFor(() => {
      expect(screen.getByTestId('custom-widget-value')).toHaveTextContent('-')
    })
  })
})
