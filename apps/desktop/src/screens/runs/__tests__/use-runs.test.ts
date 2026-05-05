import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { RUNS_FIXTURE, useRuns } from '../use-runs'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useRuns', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock runs when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useRuns())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.runs).toEqual(RUNS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock runs when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useRuns())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.runs).toEqual(RUNS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
