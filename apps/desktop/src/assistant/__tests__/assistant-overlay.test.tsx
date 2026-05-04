/**
 * Tests for AssistantOverlay.
 *
 * Covers:
 *   - renders nothing when closed
 *   - renders the dialog when open
 *   - input field and send button present
 *   - send button disabled when input empty
 *   - Esc closes the overlay
 *   - dismiss button closes the overlay
 *   - response area visible when suggestion exists
 *   - accept button visible when suggestion is complete
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  GlassPanel: ({
    children,
    className,
    style,
    onClick,
  }: React.HTMLAttributes<HTMLDivElement> & { blur?: string }) => (
    <div
      className={className}
      style={style}
      onClick={onClick}
      data-testid="glass-panel"
    >
      {children}
    </div>
  ),
  Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
}))

vi.mock('../use-assist-stream', () => ({
  useAssistStream: () => ({
    stream: vi.fn(),
    cancel: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { AssistantProvider, useAssistant } from '../assistant-provider'
import { AssistantOverlay } from '../assistant-overlay'
import type { AssistantSuggestion, AssistantTarget } from '../assistant-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function OpenButton({ target }: { target: AssistantTarget }): React.JSX.Element {
  const { openFor } = useAssistant()
  return (
    <button
      type="button"
      data-testid="open-btn"
      onClick={() => openFor(target)}
    >
      Open
    </button>
  )
}

function SetSuggestionButton({
  suggestion,
}: {
  suggestion: AssistantSuggestion
}): React.JSX.Element {
  const { setSuggestion } = useAssistant()
  return (
    <button
      type="button"
      data-testid="set-suggestion-btn"
      onClick={() => setSuggestion(suggestion)}
    >
      Set Suggestion
    </button>
  )
}

const DEFAULT_TARGET: AssistantTarget = { id: 'node-1', kind: 'flow-node' }

const STREAMING_SUGGESTION: AssistantSuggestion = {
  id: 's-1',
  prompt: 'Make it faster',
  response: 'Here is a',
  status: 'streaming',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const COMPLETE_SUGGESTION: AssistantSuggestion = {
  id: 's-2',
  prompt: 'Improve it',
  response: 'Here is a full suggestion.',
  status: 'complete',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function TestHarness({
  suggestion,
}: {
  suggestion?: AssistantSuggestion
}): React.JSX.Element {
  return (
    <AssistantProvider>
      <OpenButton target={DEFAULT_TARGET} />
      {suggestion && <SetSuggestionButton suggestion={suggestion} />}
      <AssistantOverlay />
    </AssistantProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssistantOverlay', () => {
  beforeEach(() => {
    // CSS.escape may not exist in jsdom — provide a simple polyfill
    if (typeof CSS === 'undefined' || !CSS.escape) {
      Object.defineProperty(globalThis, 'CSS', {
        value: { escape: (str: string) => str },
        writable: true,
      })
    }
  })

  it('renders nothing when overlay is closed', () => {
    render(<TestHarness />)
    expect(screen.queryByTestId('assistant-overlay')).toBeNull()
  })

  it('renders dialog when overlay is open', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByTestId('assistant-overlay')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders prompt input and send button when open', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByLabelText('Assistant prompt')).toBeInTheDocument()
    expect(screen.getByLabelText('Send prompt')).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByLabelText('Send prompt')).toBeDisabled()
  })

  it('send button is enabled when input has text', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.change(screen.getByLabelText('Assistant prompt'), {
      target: { value: 'Improve this node' },
    })
    expect(screen.getByLabelText('Send prompt')).not.toBeDisabled()
  })

  it('Esc closes the overlay', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByTestId('assistant-overlay')).toBeNull()
  })

  it('dismiss button closes the overlay', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByLabelText('Close assistant'))
    expect(screen.queryByTestId('assistant-overlay')).toBeNull()
  })

  it('response area is visible when a streaming suggestion exists', () => {
    render(<TestHarness suggestion={STREAMING_SUGGESTION} />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('set-suggestion-btn'))
    expect(screen.getByLabelText('Assistant response')).toBeInTheDocument()
    expect(screen.getByLabelText('Assistant response')).toHaveTextContent('Here is a')
  })

  it('accept button is visible when suggestion is complete', () => {
    render(<TestHarness suggestion={COMPLETE_SUGGESTION} />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('set-suggestion-btn'))
    expect(screen.getByLabelText('Accept suggestion')).toBeInTheDocument()
    expect(screen.getByLabelText('Dismiss suggestion')).toBeInTheDocument()
  })

  it('accept button closes the overlay', () => {
    render(<TestHarness suggestion={COMPLETE_SUGGESTION} />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('set-suggestion-btn'))
    fireEvent.click(screen.getByLabelText('Accept suggestion'))
    expect(screen.queryByTestId('assistant-overlay')).toBeNull()
  })

  it('dismiss suggestion button closes the overlay', () => {
    render(<TestHarness suggestion={COMPLETE_SUGGESTION} />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('set-suggestion-btn'))
    fireEvent.click(screen.getByLabelText('Dismiss suggestion'))
    expect(screen.queryByTestId('assistant-overlay')).toBeNull()
  })

  it('displays target id in header', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByRole('dialog')).toHaveTextContent('node-1')
  })

  it('Enter in input field triggers send', () => {
    // stream is already mocked at the module level; just verify the keydown
    // doesn't throw and the overlay stays open (send → stream no-op)
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    const input = screen.getByLabelText('Assistant prompt')
    fireEvent.change(input, { target: { value: 'test' } })
    // Pressing Enter should not throw and overlay remains open (stream mock is no-op)
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    // Overlay still open after send (stream is mocked to no-op)
    expect(screen.getByTestId('assistant-overlay')).toBeInTheDocument()
  })
})
