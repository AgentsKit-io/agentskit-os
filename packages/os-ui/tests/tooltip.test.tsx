import { render, screen, fireEvent, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tooltip } from '../src/components/tooltip'

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders trigger without tooltip initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip after delay on mouse enter', async () => {
    render(
      <Tooltip content="Tooltip text" delayMs={300}>
        <button>Hover me</button>
      </Tooltip>,
    )
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Hover me' }).parentElement!)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('tooltip').textContent).toBe('Tooltip text')
  })

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Tooltip text" delayMs={0}>
        <button>Hover me</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement!
    fireEvent.mouseEnter(trigger)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip on focus', async () => {
    render(
      <Tooltip content="Focus tooltip" delayMs={0}>
        <button>Focus me</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Focus me' }).parentElement!
    fireEvent.focus(trigger)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('hides tooltip on blur', async () => {
    render(
      <Tooltip content="Blur tooltip" delayMs={0}>
        <button>Blur me</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Blur me' }).parentElement!
    fireEvent.focus(trigger)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.blur(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
