import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { EVAL_SUITES_FIXTURE, useEvals } from '../use-evals'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useEvals', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock eval suites when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useEvals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.suites).toEqual(EVAL_SUITES_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock eval suites when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useEvals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.suites).toEqual(EVAL_SUITES_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
