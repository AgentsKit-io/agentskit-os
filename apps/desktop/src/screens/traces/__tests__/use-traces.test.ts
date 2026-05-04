import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_SPANS, MOCK_TRACES, useTraceSpans, useTraces } from '../use-traces'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useTraces', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock traces when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useTraces())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.traces).toEqual(MOCK_TRACES)
    expect(result.current.error).toBeNull()
  })
})

describe('useTraceSpans', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock spans when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useTraceSpans('trace-001'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.spans).toEqual(MOCK_SPANS['trace-001'])
    expect(result.current.error).toBeNull()
  })
})
