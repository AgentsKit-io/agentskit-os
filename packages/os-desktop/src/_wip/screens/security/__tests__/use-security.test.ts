import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SECURITY_CONTROLS_FIXTURE, useSecurityControls } from '../use-security'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useSecurityControls', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock security controls when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({ controls: [] })

    const { result } = renderHook(() => useSecurityControls())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.controls).toEqual(SECURITY_CONTROLS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock security controls when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useSecurityControls())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.controls).toEqual(SECURITY_CONTROLS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
