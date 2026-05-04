import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_HITL_REQUESTS, useHitlRequests } from '../use-hitl'

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

    expect(result.current.requests).toEqual(MOCK_HITL_REQUESTS)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock approvals when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useHitlRequests())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.requests).toEqual(MOCK_HITL_REQUESTS)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
