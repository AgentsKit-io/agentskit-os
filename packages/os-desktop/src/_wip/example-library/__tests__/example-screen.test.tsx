/**
 * Integration tests for ExampleScreen — filter, search, and card rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'

// Mock the runner hook so tests don't hit sidecar
vi.mock('../use-example-runner', () => ({
  useExampleRunner: () => ({
    run: vi.fn().mockResolvedValue(undefined),
    isRunning: false,
    workspacePath: null,
    error: null,
    reset: vi.fn(),
  }),
}))

import { ExampleScreen } from '../example-screen'
import { EXAMPLES, ALL_INTENTS } from '../examples-data'

describe('ExampleScreen', () => {
  beforeEach(() => {
    render(<ExampleScreen />)
  })

  it('renders the page heading', () => {
    expect(screen.getByRole('heading', { name: /example library/i })).toBeInTheDocument()
  })

  it('renders all 12 examples by default', () => {
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(12)
  })

  it('renders a search input', () => {
    expect(screen.getByRole('searchbox', { name: /search examples/i })).toBeInTheDocument()
  })

  it('renders an "All" filter button', () => {
    expect(screen.getByTestId('intent-filter-all')).toBeInTheDocument()
  })

  it('renders one filter button per intent', () => {
    for (const intent of ALL_INTENTS) {
      expect(screen.getByTestId(`intent-filter-${intent}`)).toBeInTheDocument()
    }
  })

  it('filters examples by intent when an intent button is clicked', () => {
    const intent = ALL_INTENTS[0]!
    fireEvent.click(screen.getByTestId(`intent-filter-${intent}`))
    const expected = EXAMPLES.filter((e) => e.intent === intent)
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(expected.length)
  })

  it('resets to all examples when "All" is clicked after filtering', () => {
    const intent = ALL_INTENTS[0]!
    fireEvent.click(screen.getByTestId(`intent-filter-${intent}`))
    fireEvent.click(screen.getByTestId('intent-filter-all'))
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(12)
  })

  it('filters examples by text search in title', () => {
    const search = screen.getByRole('searchbox', { name: /search examples/i })
    // "PR" appears in "GitHub PR Reviewer" and "3-Way Consensus PR Review"
    fireEvent.change(search, { target: { value: 'PR Reviewer' } })
    const cards = screen.getAllByRole('article')
    expect(cards.length).toBeGreaterThanOrEqual(1)
    // None should be "NPS Comment Classifier"
    expect(screen.queryByText('NPS Comment Classifier')).not.toBeInTheDocument()
  })

  it('filters examples by text search in tags', () => {
    const search = screen.getByRole('searchbox', { name: /search examples/i })
    fireEvent.change(search, { target: { value: 'hitl' } })
    const cards = screen.getAllByRole('article')
    // Only examples tagged with 'hitl'
    expect(cards.length).toBeGreaterThanOrEqual(1)
  })

  it('shows no-results message when search matches nothing', () => {
    const search = screen.getByRole('searchbox', { name: /search examples/i })
    fireEvent.change(search, { target: { value: 'xyzzy_nonexistent_12345' } })
    expect(screen.getByTestId('no-results')).toBeInTheDocument()
  })

  it('shows example count in header', () => {
    expect(screen.getByText(/12 examples/i)).toBeInTheDocument()
  })

  it('intent filter toggles off when clicked again', () => {
    const intent = ALL_INTENTS[0]!
    const btn = screen.getByTestId(`intent-filter-${intent}`)
    fireEvent.click(btn)
    fireEvent.click(btn)
    // Should be back to all examples
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(12)
  })
})
