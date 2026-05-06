/**
 * Tests for VoiceOverlay component.
 *
 * Covers:
 *   - Hidden when state is idle or error
 *   - Visible when listening or processing
 *   - Shows latest transcript text
 *   - Shows fallback text when no transcript
 *   - Click calls stop()
 */

import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceContext } from '../voice-provider'
import { VoiceOverlay } from '../voice-overlay'
import type { VoiceContextValue } from '../voice-provider'
import type { VoiceTranscript } from '../voice-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithVoiceCtx(value: VoiceContextValue) {
  return render(
    createElement(
      VoiceContext.Provider,
      { value },
      createElement(VoiceOverlay, null),
    ),
  )
}

function makeCtx(overrides: Partial<VoiceContextValue> = {}): VoiceContextValue {
  return {
    state: 'idle',
    errorReason: '',
    transcripts: [],
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  }
}

function makeTranscript(text: string, finalized = false): VoiceTranscript {
  return {
    id: `voice-${Date.now()}`,
    text,
    finalized,
    startedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceOverlay', () => {
  it('renders nothing when state is idle', () => {
    renderWithVoiceCtx(makeCtx({ state: 'idle' }))
    expect(screen.queryByTestId('voice-overlay')).not.toBeInTheDocument()
  })

  it('renders nothing when state is error', () => {
    renderWithVoiceCtx(makeCtx({ state: 'error', errorReason: 'not supported' }))
    expect(screen.queryByTestId('voice-overlay')).not.toBeInTheDocument()
  })

  it('renders when state is listening', () => {
    renderWithVoiceCtx(makeCtx({ state: 'listening' }))
    expect(screen.getByTestId('voice-overlay')).toBeInTheDocument()
  })

  it('renders when state is processing', () => {
    renderWithVoiceCtx(makeCtx({ state: 'processing' }))
    expect(screen.getByTestId('voice-overlay')).toBeInTheDocument()
  })

  it('shows "Listening…" fallback when no transcripts', () => {
    renderWithVoiceCtx(makeCtx({ state: 'listening', transcripts: [] }))
    expect(screen.getByTestId('voice-overlay')).toHaveTextContent('Listening…')
  })

  it('shows "Processing…" fallback when processing with no text', () => {
    renderWithVoiceCtx(makeCtx({ state: 'processing', transcripts: [] }))
    expect(screen.getByTestId('voice-overlay')).toHaveTextContent('Processing…')
  })

  it('shows the latest transcript text', () => {
    const transcripts = [
      makeTranscript('open dashboard', true),
      makeTranscript('run flow'),
    ]
    renderWithVoiceCtx(makeCtx({ state: 'listening', transcripts }))
    expect(screen.getByTestId('voice-overlay')).toHaveTextContent('run flow')
  })

  it('calls stop() when clicked', () => {
    const stop = vi.fn()
    renderWithVoiceCtx(makeCtx({ state: 'listening', stop }))
    fireEvent.click(screen.getByRole('button', { name: /stop voice mode/i }))
    expect(stop).toHaveBeenCalledOnce()
  })

  it('has role="status" and aria-live="polite"', () => {
    renderWithVoiceCtx(makeCtx({ state: 'listening' }))
    const overlay = screen.getByTestId('voice-overlay')
    expect(overlay).toHaveAttribute('role', 'status')
    expect(overlay).toHaveAttribute('aria-live', 'polite')
  })
})
