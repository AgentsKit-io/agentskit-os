/**
 * TraceList unit tests.
 *
 * Verifies:
 * - Mock list renders correct number of rows
 * - Clicking a row marks it selected (data-selected="true")
 * - data-testid is present on the chosen row
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TraceList } from '../trace-list'
import { TRACES_FIXTURE } from '../use-traces'

// ---------------------------------------------------------------------------
// Mock the useTraces hook to return deterministic mock data
// ---------------------------------------------------------------------------

vi.mock('../use-traces', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../use-traces')>()
  return {
    ...actual,
    useTraces: () => ({
      traces: actual.TRACES_FIXTURE,
      loading: false,
      error: null,
    }),
  }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TraceList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row for each mock trace', () => {
    const onSelect = vi.fn()
    render(<TraceList selectedTraceId={null} onSelect={onSelect} />)

    const rows = screen.getAllByTestId('trace-row')
    expect(rows).toHaveLength(TRACES_FIXTURE.length)
  })

  it('renders the table container', () => {
    const onSelect = vi.fn()
    render(<TraceList selectedTraceId={null} onSelect={onSelect} />)

    expect(screen.getByTestId('trace-list-table')).toBeInTheDocument()
  })

  it('marks no row as selected when selectedTraceId is null', () => {
    const onSelect = vi.fn()
    render(<TraceList selectedTraceId={null} onSelect={onSelect} />)

    const rows = screen.getAllByTestId('trace-row')
    for (const row of rows) {
      expect(row).toHaveAttribute('data-selected', 'false')
    }
  })

  it('marks the correct row as selected when selectedTraceId is set', () => {
    const firstTrace = TRACES_FIXTURE[0]
    if (firstTrace === undefined) throw new Error('No mock traces')

    const onSelect = vi.fn()
    render(
      <TraceList selectedTraceId={firstTrace.traceId} onSelect={onSelect} />,
    )

    const row = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === firstTrace.traceId)

    expect(row).toBeDefined()
    expect(row).toHaveAttribute('data-selected', 'true')
  })

  it('calls onSelect with the correct traceId when a row is clicked', () => {
    const secondTrace = TRACES_FIXTURE[1]
    if (secondTrace === undefined) throw new Error('Need at least 2 mock traces')

    const onSelect = vi.fn()
    render(<TraceList selectedTraceId={null} onSelect={onSelect} />)

    const row = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === secondTrace.traceId)

    expect(row).toBeDefined()
    fireEvent.click(row!)
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(secondTrace.traceId)
  })

  it('updates selection after clicking a different row', () => {
    const firstTrace = TRACES_FIXTURE[0]
    const secondTrace = TRACES_FIXTURE[1]
    if (firstTrace === undefined || secondTrace === undefined) {
      throw new Error('Need at least 2 mock traces')
    }

    const onSelect = vi.fn()
    const { rerender } = render(
      <TraceList selectedTraceId={firstTrace.traceId} onSelect={onSelect} />,
    )

    // First row should be selected
    const firstRow = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === firstTrace.traceId)
    expect(firstRow).toHaveAttribute('data-selected', 'true')

    // Click second row
    const secondRow = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === secondTrace.traceId)
    fireEvent.click(secondRow!)
    expect(onSelect).toHaveBeenCalledWith(secondTrace.traceId)

    // Rerender with second trace selected
    rerender(
      <TraceList selectedTraceId={secondTrace.traceId} onSelect={onSelect} />,
    )

    const updatedSecond = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === secondTrace.traceId)
    expect(updatedSecond).toHaveAttribute('data-selected', 'true')

    const updatedFirst = screen
      .getAllByTestId('trace-row')
      .find((r) => r.getAttribute('data-trace-id') === firstTrace.traceId)
    expect(updatedFirst).toHaveAttribute('data-selected', 'false')
  })

  it('renders flow IDs from mock data', () => {
    const onSelect = vi.fn()
    render(<TraceList selectedTraceId={null} onSelect={onSelect} />)

    for (const trace of TRACES_FIXTURE) {
      expect(screen.getByText(trace.flowId)).toBeInTheDocument()
    }
  })
})
