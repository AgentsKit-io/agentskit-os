/**
 * Tests for SkipToContent component.
 *
 * Covers:
 *   - Renders an anchor element
 *   - Default href points to #main-content
 *   - Custom targetId is respected
 *   - Default label is "Skip to main content"
 *   - Custom label is rendered
 *   - data-testid is set
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkipToContent } from '../src/components/skip-to-content'

describe('SkipToContent', () => {
  it('renders a link element', () => {
    render(<SkipToContent />)
    expect(screen.getByTestId('skip-to-content').tagName.toLowerCase()).toBe('a')
  })

  it('defaults href to #main-content', () => {
    render(<SkipToContent />)
    const link = screen.getByTestId('skip-to-content')
    expect(link.getAttribute('href')).toBe('#main-content')
  })

  it('uses custom targetId when provided', () => {
    render(<SkipToContent targetId="custom-target" />)
    const link = screen.getByTestId('skip-to-content')
    expect(link.getAttribute('href')).toBe('#custom-target')
  })

  it('renders default label text', () => {
    render(<SkipToContent />)
    expect(screen.getByText('Skip to main content')).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<SkipToContent label="Skip navigation" />)
    expect(screen.getByText('Skip navigation')).toBeInTheDocument()
  })

  it('is initially visually hidden without leaking a focus outline', () => {
    render(<SkipToContent />)
    const link = screen.getByTestId('skip-to-content')
    expect(link).toHaveStyle({ opacity: '0', outline: 'none' })
  })
})
