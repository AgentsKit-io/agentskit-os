import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_BENCHMARK_RESULTS, useBenchmarks } from '../use-benchmarks'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useBenchmarks', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock benchmark results when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useBenchmarks())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toEqual(MOCK_BENCHMARK_RESULTS)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock benchmark results when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useBenchmarks())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toEqual(MOCK_BENCHMARK_RESULTS)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
