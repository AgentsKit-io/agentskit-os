/**
 * Tests for VoiceToggle component.
 *
 * Covers:
 *   - Renders mic-off button when idle
 *   - aria-pressed reflects active state
 *   - Click calls toggle()
 */

import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceContext } from '../voice-provider'
import { VoiceToggle } from '../voice-toggle'
import type { VoiceContextValue } from '../voice-provider'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithVoiceCtx(value: VoiceContextValue) {
  return render(
    createElement(
      VoiceContext.Provider,
      { value },
      createElement(VoiceToggle, null),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceToggle', () => {
  it('renders with aria-label "Start voice mode" when idle', () => {
    renderWithVoiceCtx(makeCtx({ state: 'idle' }))
    expect(screen.getByRole('button', { name: /start voice mode/i })).toBeInTheDocument()
  })

  it('renders with aria-label "Stop voice mode" when listening', () => {
    renderWithVoiceCtx(makeCtx({ state: 'listening' }))
    expect(screen.getByRole('button', { name: /stop voice mode/i })).toBeInTheDocument()
  })

  it('aria-pressed is false when idle', () => {
    renderWithVoiceCtx(makeCtx({ state: 'idle' }))
    const btn = screen.getByTestId('voice-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('aria-pressed is true when listening', () => {
    renderWithVoiceCtx(makeCtx({ state: 'listening' }))
    const btn = screen.getByTestId('voice-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('aria-pressed is true when processing', () => {
    renderWithVoiceCtx(makeCtx({ state: 'processing' }))
    const btn = screen.getByTestId('voice-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls toggle on click', () => {
    const toggle = vi.fn()
    renderWithVoiceCtx(makeCtx({ toggle }))
    fireEvent.click(screen.getByTestId('voice-toggle'))
    expect(toggle).toHaveBeenCalledOnce()
  })
})
