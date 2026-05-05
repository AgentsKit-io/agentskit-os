import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { HITL_REQUESTS_FIXTURE, useHitlRequests } from '../use-hitl'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useHitlRequests', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock approvals when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useHitlRequests())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.requests).toEqual(HITL_REQUESTS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock approvals when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useHitlRequests())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.requests).toEqual(HITL_REQUESTS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
