import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { FLOWS_FIXTURE, useFlows } from '../use-flows'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useFlows', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock flows when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({ flows: [] })

    const { result } = renderHook(() => useFlows())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.flows).toEqual(FLOWS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock flows when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useFlows())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.flows).toEqual(FLOWS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
