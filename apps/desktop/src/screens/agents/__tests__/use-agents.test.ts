import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AGENTS_FIXTURE, useAgents } from '../use-agents'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useAgents', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock agents when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useAgents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.agents).toEqual(AGENTS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock agents when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useAgents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.agents).toEqual(AGENTS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
