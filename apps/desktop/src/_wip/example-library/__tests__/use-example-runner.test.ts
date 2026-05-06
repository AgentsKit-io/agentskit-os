/**
 * Unit tests for useExampleRunner hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExampleRunner } from '../use-example-runner'

// ---------------------------------------------------------------------------
// Mock sidecar
// ---------------------------------------------------------------------------

const mockSidecarRequest = vi.fn()

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExampleRunner', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useExampleRunner())
    expect(result.current.isRunning).toBe(false)
    expect(result.current.workspacePath).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('calls sidecarRequest with correct method and params', async () => {
    mockSidecarRequest.mockResolvedValue({ workspacePath: '/tmp/ws' })
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run('support-triage', 'triage-support-tickets-basic')
    })

    expect(mockSidecarRequest).toHaveBeenCalledWith('templates.scaffoldFrom', {
      templateId: 'support-triage',
      exampleId: 'triage-support-tickets-basic',
    })
  })

  it('sets workspacePath on success', async () => {
    mockSidecarRequest.mockResolvedValue({ workspacePath: '/home/user/projects/my-flow' })
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run('pr-review', 'generate-pr-review-standard')
    })

    expect(result.current.workspacePath).toBe('/home/user/projects/my-flow')
    expect(result.current.error).toBeNull()
  })

  it('sets error on sidecar failure', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar not available'))
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run('pr-review', 'generate-pr-review-standard')
    })

    expect(result.current.error).toBe('sidecar not available')
    expect(result.current.workspacePath).toBeNull()
  })

  it('does not call sidecarRequest when templateId is null', async () => {
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run(null, 'coming-soon-example')
    })

    expect(mockSidecarRequest).not.toHaveBeenCalled()
    expect(result.current.isRunning).toBe(false)
  })

  it('reset clears workspacePath and error', async () => {
    mockSidecarRequest.mockResolvedValue({ workspacePath: '/tmp/ws' })
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run('pr-review', 'generate-pr-review-standard')
    })

    expect(result.current.workspacePath).toBe('/tmp/ws')

    act(() => {
      result.current.reset()
    })

    expect(result.current.workspacePath).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isRunning).toBe(false)
  })

  it('isRunning is false after run completes', async () => {
    mockSidecarRequest.mockResolvedValue({ workspacePath: '/tmp/ws' })
    const { result } = renderHook(() => useExampleRunner())

    await act(async () => {
      await result.current.run('pr-review', 'generate-pr-review-standard')
    })

    expect(result.current.isRunning).toBe(false)
  })
})
