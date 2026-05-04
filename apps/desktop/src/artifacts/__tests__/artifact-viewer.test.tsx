/**
 * Tests for ArtifactViewer + useArtifactViewer.
 *
 * Covers:
 *   - Provider: starts with no artifact open (current === null)
 *   - Provider: open() sets current artifact
 *   - Provider: close() clears current artifact
 *   - Provider: Cmd+Shift+A closes current artifact
 *   - Provider: throws when used outside provider
 *   - ArtifactViewer: renders nothing when closed
 *   - ArtifactViewer: renders dialog when artifact is open
 *   - ArtifactViewer: shows artifact title in dialog
 *   - ArtifactViewer: Escape key closes the dialog
 *   - ArtifactViewer: clicking backdrop closes the dialog
 *   - ArtifactViewer: close button closes the dialog
 *   - ArtifactViewer: copy button copies content
 *   - ArtifactViewer: word-wrap toggle changes aria-pressed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { ArtifactViewerProvider, useArtifactViewer } from '../use-artifact-viewer'
import { ArtifactViewer } from '../artifact-viewer'
import type { Artifact } from '../artifact-types'

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
// Test fixtures
// ---------------------------------------------------------------------------

const CODE_ARTIFACT: Artifact = {
  id: 'art-001',
  kind: 'code',
  mime: 'text/plain',
  content: 'const x = 42',
  name: 'example.ts',
}

const JSON_ARTIFACT: Artifact = {
  id: 'art-002',
  kind: 'json',
  mime: 'application/json',
  content: '{"key":"value"}',
  name: 'data.json',
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function OpenButton({ artifact }: { artifact: Artifact }): React.JSX.Element {
  const { open } = useArtifactViewer()
  return (
    <button data-testid="open-btn" onClick={() => open(artifact)}>
      Open
    </button>
  )
}

function CloseButton(): React.JSX.Element {
  const { close } = useArtifactViewer()
  return (
    <button data-testid="close-btn" onClick={close}>
      Close
    </button>
  )
}

function CurrentDisplay(): React.JSX.Element {
  const { current } = useArtifactViewer()
  return <span data-testid="current">{current?.id ?? 'none'}</span>
}

function TestHarness({ artifact = CODE_ARTIFACT }: { artifact?: Artifact }): React.JSX.Element {
  return (
    <ArtifactViewerProvider>
      <OpenButton artifact={artifact} />
      <CloseButton />
      <CurrentDisplay />
      <ArtifactViewer />
    </ArtifactViewerProvider>
  )
}

// ---------------------------------------------------------------------------
// useArtifactViewer tests
// ---------------------------------------------------------------------------

describe('ArtifactViewerProvider / useArtifactViewer', () => {
  it('starts with no artifact (current === null)', () => {
    render(<TestHarness />)
    expect(screen.getByTestId('current')).toHaveTextContent('none')
  })

  it('open() sets the current artifact', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByTestId('current')).toHaveTextContent('art-001')
  })

  it('close() clears the current artifact', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(screen.getByTestId('current')).toHaveTextContent('none')
  })

  it('Cmd+Shift+A closes an open artifact', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByTestId('current')).toHaveTextContent('art-001')

    act(() => {
      fireEvent.keyDown(window, { key: 'A', shiftKey: true, metaKey: true })
    })
    expect(screen.getByTestId('current')).toHaveTextContent('none')
  })

  it('Ctrl+Shift+A closes on Windows/Linux', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))

    act(() => {
      fireEvent.keyDown(window, { key: 'A', shiftKey: true, ctrlKey: true })
    })
    expect(screen.getByTestId('current')).toHaveTextContent('none')
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<CurrentDisplay />)).toThrow(
      'useArtifactViewer must be used within an ArtifactViewerProvider',
    )
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// ArtifactViewer modal tests
// ---------------------------------------------------------------------------

describe('ArtifactViewer modal', () => {
  // Suppress clipboard errors in jsdom
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when no artifact is open', () => {
    render(<TestHarness />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a dialog when an artifact is open', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the artifact name in the dialog', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByText('example.ts')).toBeInTheDocument()
  })

  it('Escape key closes the dialog', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('close button closes the dialog', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const closeBtn = screen.getByLabelText('Close artifact viewer')
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking the backdrop closes the dialog', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const dialog = screen.getByRole('dialog')
    // Simulate clicking the backdrop (the dialog element itself, not a child)
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('copy button calls clipboard.writeText', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const copyBtn = screen.getByLabelText('Copy content')
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CODE_ARTIFACT.content)
  })

  it('word-wrap toggle changes aria-pressed state', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const wrapBtn = screen.getByLabelText('Toggle word wrap')
    expect(wrapBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(wrapBtn)
    expect(wrapBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows JSON artifact content', () => {
    render(<TestHarness artifact={JSON_ARTIFACT} />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('data.json')).toBeInTheDocument()
  })
})
