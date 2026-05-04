import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_TRIGGERS, useTriggers } from '../use-triggers'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useTriggers', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock triggers when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useTriggers())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.triggers).toEqual(MOCK_TRIGGERS)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock triggers when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useTriggers())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.triggers).toEqual(MOCK_TRIGGERS)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
