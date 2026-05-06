/**
 * Tests for SearchOverlay and SearchProvider.
 *
 * Covers:
 *   - SearchProvider: isOpen toggles on open/close
 *   - SearchProvider: Cmd+/ / Ctrl+/ keyboard shortcut
 *   - SearchOverlay: renders nothing when closed
 *   - SearchOverlay: renders search input when open
 *   - SearchOverlay: shows results for a query
 *   - SearchOverlay: Enter runs the selected result
 *   - SearchOverlay: Esc closes the overlay
 *   - SearchOverlay: renders grouped result sections
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
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

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn().mockRejectedValue(new Error('sidecar not available')),
  subscribeEvents: vi.fn().mockReturnValue(() => undefined),
  getSidecarStatus: vi.fn().mockResolvedValue('disconnected'),
}))

vi.mock('../../screens/traces/use-traces', () => ({
  useTraces: () => ({ traces: [], loading: false, error: null }),
  useTraceSpans: () => ({ spans: [], loading: false, error: null }),
}))

vi.mock('@agentskit/os-ui', () => ({
  GlassPanel: ({ children, className, style, onClick }: React.HTMLAttributes<HTMLDivElement> & { blur?: string }) => (
    <div className={className} style={style} onClick={onClick} data-testid="glass-panel">{children}</div>
  ),
  Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
  Card: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

import { SearchProvider, useSearch } from '../search-provider'
import { SearchOverlay } from '../search-overlay'
import { useWorkspaces } from '../../workspaces/workspaces-provider'
import { useCommandPalette } from '../../command-palette/command-palette-provider'

vi.mock('../../workspaces/workspaces-provider', () => ({
  useWorkspaces: vi.fn(() => ({
    all: [{ id: 'ws-1', name: 'Default Workspace', status: 'idle' }],
    current: null,
    switch: vi.fn(),
    status: 'ready',
  })),
}))

vi.mock('../../command-palette/command-palette-provider', () => ({
  useCommandPalette: vi.fn(() => ({
    commands: [
      {
        id: 'nav.dashboard',
        label: 'Go to Dashboard',
        keywords: ['home'],
        category: 'Navigation',
        run: vi.fn(),
      },
    ],
    open: false,
    openPalette: vi.fn(),
    closePalette: vi.fn(),
    registerCommand: vi.fn(),
  })),
}))

function OpenButton(): React.JSX.Element {
  const { open } = useSearch()
  return <button onClick={open} data-testid="open-btn">Open Search</button>
}

function CloseButton(): React.JSX.Element {
  const { close } = useSearch()
  return <button onClick={close} data-testid="close-btn">Close</button>
}

function IsOpenDisplay(): React.JSX.Element {
  const { isOpen } = useSearch()
  return <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
}

function TestHarness(): React.JSX.Element {
  return (
    <SearchProvider>
      <OpenButton />
      <CloseButton />
      <IsOpenDisplay />
      <SearchOverlay />
    </SearchProvider>
  )
}

// ---------------------------------------------------------------------------
// SearchProvider tests
// ---------------------------------------------------------------------------

describe('SearchProvider', () => {
  it('starts closed', () => {
    render(<TestHarness />)
    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
  })

  it('opens when open() is called', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
  })

  it('closes when close() is called', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
  })

  it('toggles on Cmd+/ keydown', () => {
    render(<TestHarness />)
    act(() => {
      fireEvent.keyDown(window, { key: '/', metaKey: true })
    })
    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
    act(() => {
      fireEvent.keyDown(window, { key: '/', metaKey: true })
    })
    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
  })

  it('opens on Ctrl+/ keydown (Windows/Linux)', () => {
    render(<TestHarness />)
    act(() => {
      fireEvent.keyDown(window, { key: '/', ctrlKey: true })
    })
    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
  })

  it('throws when useSearch used outside provider', () => {
    // Suppress console.error for expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<IsOpenDisplay />)).toThrow()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// SearchOverlay tests
// ---------------------------------------------------------------------------

describe('SearchOverlay', () => {
  beforeEach(() => {
    vi.mocked(useWorkspaces).mockReturnValue({
      all: [{ id: 'ws-1', name: 'Default Workspace', status: 'idle' }],
      current: null,
      switch: vi.fn(),
      status: 'ready',
    })
    vi.mocked(useCommandPalette).mockReturnValue({
      commands: [
        {
          id: 'nav.dashboard',
          label: 'Go to Dashboard',
          keywords: ['home'],
          category: 'Navigation',
          run: vi.fn(),
        },
      ],
      open: false,
      openPalette: vi.fn(),
      closePalette: vi.fn(),
      registerCommand: vi.fn(),
    })
  })

  it('renders nothing when closed', () => {
    render(<TestHarness />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the dialog when open', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the search input when open', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('shows results matching the query', async () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    await waitFor(() => {
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })
  })

  it('shows workspace results when query matches workspace name', async () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'default' } })
    await waitFor(() => {
      expect(screen.getByText('Default Workspace')).toBeInTheDocument()
    })
  })

  it('closes on Escape key', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when backdrop is clicked', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('runs selected result on Enter', async () => {
    const runFn = vi.fn()
    vi.mocked(useCommandPalette).mockReturnValue({
      commands: [
        { id: 'test.cmd', label: 'Test Command', keywords: [], category: 'System', run: runFn },
      ],
      open: false,
      openPalette: vi.fn(),
      closePalette: vi.fn(),
      registerCommand: vi.fn(),
    })

    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Command')).toBeInTheDocument()
    })

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(runFn).toHaveBeenCalled()
  })

  it('shows "no results" message when query has no matches', async () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'zzzzzzzzz_no_match' } })
    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument()
    })
  })

  it('renders group headings for matched categories', async () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'dashboard' } })
    await waitFor(() => {
      expect(screen.getByText('Commands')).toBeInTheDocument()
    })
  })
})
