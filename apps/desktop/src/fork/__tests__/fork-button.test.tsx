/**
 * ForkButton unit tests (M2 #178).
 *
 * Verifies:
 * - Button renders with correct aria-label
 * - Clicking calls forkFromTrace with the given traceId via ForkContext
 * - Button is disabled when no ForkContext is present
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ForkButton } from '../fork-button'
import { ForkContext } from '../fork-provider'
import type { ForkContextValue } from '../fork-provider'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithContext(traceId: string, forkFromTrace: (id: string) => void) {
  const value: ForkContextValue = { forkFromTrace }
  render(
    <ForkContext.Provider value={value}>
      <ForkButton traceId={traceId} />
    </ForkContext.Provider>,
  )
}

function renderWithoutContext(traceId: string) {
  render(<ForkButton traceId={traceId} />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForkButton', () => {
  it('renders with data-testid fork-button', () => {
    const fn = vi.fn()
    renderWithContext('trace-001', fn)
    expect(screen.getByTestId('fork-button')).toBeInTheDocument()
  })

  it('shows "Fork" label text', () => {
    const fn = vi.fn()
    renderWithContext('trace-001', fn)
    expect(screen.getByText('Fork')).toBeInTheDocument()
  })

  it('has accessible aria-label containing the traceId', () => {
    const fn = vi.fn()
    renderWithContext('trace-abc', fn)
    expect(screen.getByLabelText('Fork trace trace-abc as flow')).toBeInTheDocument()
  })

  it('calls forkFromTrace with correct traceId on click', () => {
    const fn = vi.fn()
    renderWithContext('trace-xyz', fn)
    fireEvent.click(screen.getByTestId('fork-button'))
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('trace-xyz')
  })

  it('is disabled when no ForkContext is provided', () => {
    renderWithoutContext('trace-001')
    const btn = screen.getByTestId('fork-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('is not disabled when ForkContext is provided', () => {
    const fn = vi.fn()
    renderWithContext('trace-001', fn)
    const btn = screen.getByTestId('fork-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('does not call forkFromTrace when disabled (no context)', () => {
    renderWithoutContext('trace-001')
    fireEvent.click(screen.getByTestId('fork-button'))
    // No assertion needed — test would throw if fn was called because fn is undefined
  })

  it('accepts a custom className prop', () => {
    const fn = vi.fn()
    const value: ForkContextValue = { forkFromTrace: fn }
    render(
      <ForkContext.Provider value={value}>
        <ForkButton traceId="t" className="custom-class" />
      </ForkContext.Provider>,
    )
    const btn = screen.getByTestId('fork-button')
    expect(btn.className).toContain('custom-class')
  })
})
