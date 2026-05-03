/**
 * Tests for LiveRegion component.
 *
 * Covers:
 *   - Renders an element with role="status"
 *   - Has aria-live="polite" by default
 *   - Supports aria-live="assertive" via politeness prop
 *   - Is visually hidden via inline styles
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiveRegion } from '../src/components/live-region'

describe('LiveRegion', () => {
  it('renders an element with role="status"', () => {
    render(<LiveRegion message="Hello" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-live="polite" by default', () => {
    render(<LiveRegion message="Hello" />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
  })

  it('accepts aria-live="assertive" via politeness prop', () => {
    render(<LiveRegion message="Urgent" politeness="assertive" />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('assertive')
  })

  it('accepts aria-live="off" via politeness prop', () => {
    render(<LiveRegion message="Silent" politeness="off" />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('off')
  })

  it('has aria-atomic attribute', () => {
    render(<LiveRegion message="Atomic" atomic />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-atomic')).toBe('true')
  })

  it('is visually hidden via position:absolute style', () => {
    render(<LiveRegion message="Hidden" />)
    const region = screen.getByRole('status')
    expect(region).toHaveStyle({ position: 'absolute' })
  })

  it('renders with an empty message without error', () => {
    render(<LiveRegion message="" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
