/**
 * Unit tests for ExampleCard.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ExampleCard } from '../example-card'
import type { Example } from '../example-types'

const baseExample: Example = {
  id: 'test-example',
  intent: 'Triage support tickets',
  title: 'Test Example',
  description: 'A test example description.',
  templateId: 'support-triage',
  tags: ['support', 'test'],
  estCostUsd: 0.005,
  estTokens: 2000,
}

const comingSoonExample: Example = {
  ...baseExample,
  id: 'coming-soon-example',
  templateId: null,
}

describe('ExampleCard', () => {
  it('renders the example title', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} />)
    expect(screen.getByText('Test Example')).toBeInTheDocument()
  })

  it('renders the intent badge', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} />)
    expect(screen.getByText('Triage support tickets')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} />)
    expect(screen.getByText('A test example description.')).toBeInTheDocument()
  })

  it('renders the estimated cost pill', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} />)
    expect(screen.getByText('~$0.005')).toBeInTheDocument()
  })

  it('renders "Try in OS" button when templateId is set', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} />)
    expect(screen.getByRole('button', { name: /try in os/i })).toBeInTheDocument()
  })

  it('calls onTry with the example when "Try in OS" is clicked', () => {
    const onTry = vi.fn()
    render(<ExampleCard example={baseExample} onTry={onTry} />)
    fireEvent.click(screen.getByRole('button', { name: /try in os/i }))
    expect(onTry).toHaveBeenCalledWith(baseExample)
  })

  it('renders "Coming soon" instead of Try button when templateId is null', () => {
    render(<ExampleCard example={comingSoonExample} onTry={vi.fn()} />)
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try in os/i })).not.toBeInTheDocument()
  })

  it('disables the Try button when isRunning is true', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} isRunning />)
    const btn = screen.getByRole('button', { name: /running/i })
    expect(btn).toBeDisabled()
  })

  it('shows "Running…" text when isRunning is true', () => {
    render(<ExampleCard example={baseExample} onTry={vi.fn()} isRunning />)
    expect(screen.getByText('Running…')).toBeInTheDocument()
  })

  it('does not render cost pill when estCostUsd is absent', () => {
    const nocost: Example = { ...baseExample, estCostUsd: undefined }
    render(<ExampleCard example={nocost} onTry={vi.fn()} />)
    expect(screen.queryByTitle('Estimated cost per run')).not.toBeInTheDocument()
  })
})
