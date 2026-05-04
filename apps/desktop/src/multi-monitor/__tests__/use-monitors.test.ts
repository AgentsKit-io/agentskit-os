/**
 * Tests for useMonitors hook.
 *
 * Verifies that:
 *  - When `invoke` resolves with valid data the hook returns parsed monitors.
 *  - When `invoke` resolves with invalid data the hook falls back to the
 *    mock single-monitor array.
 *  - When `invoke` rejects (non-Tauri environment) the hook falls back to
 *    the mock array and does NOT set an error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { useMonitors, type UseMonitorsResult } from '../use-monitors'

// ---------------------------------------------------------------------------
// Mock Tauri invoke
// ---------------------------------------------------------------------------

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
const mockInvoke = vi.mocked(invoke)

// ---------------------------------------------------------------------------
// Helper — renders the hook and captures state via a ref
// ---------------------------------------------------------------------------

function renderHook(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  getResult: () => UseMonitorsResult | undefined
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let result: UseMonitorsResult | undefined

  function Probe() {
    result = useMonitors()
    return null
  }

  act(() => {
    root.render(createElement(Probe, null))
  })

  return {
    container,
    root,
    getResult: () => result,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMonitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mock monitor when invoke rejects (non-Tauri environment)', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Tauri not available'))

    const { root, container, getResult } = renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    const result = getResult()
    expect(result?.loading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.monitors).toHaveLength(1)
    expect(result?.monitors[0]?.name).toContain('mock')

    act(() => { root.unmount() })
    container.remove()
  })

  it('returns parsed monitors when invoke resolves with valid data', async () => {
    const raw = [
      {
        id: '0',
        name: 'Built-in Display',
        x: 0,
        y: 0,
        width: 2560,
        height: 1440,
        scaleFactor: 2,
      },
    ]
    mockInvoke.mockResolvedValueOnce(raw)

    const { root, container, getResult } = renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    const result = getResult()
    expect(result?.loading).toBe(false)
    expect(result?.monitors).toHaveLength(1)
    expect(result?.monitors[0]?.name).toBe('Built-in Display')
    expect(result?.monitors[0]?.scaleFactor).toBe(2)

    act(() => { root.unmount() })
    container.remove()
  })

  it('falls back to mock monitor when invoke resolves with invalid data', async () => {
    mockInvoke.mockResolvedValueOnce({ notAnArray: true })

    const { root, container, getResult } = renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    const result = getResult()
    expect(result?.loading).toBe(false)
    expect(result?.monitors).toHaveLength(1)
    expect(result?.monitors[0]?.id).toBe('0')

    act(() => { root.unmount() })
    container.remove()
  })

  it('starts in loading state', () => {
    // Never-resolving promise so we can inspect the initial loading state.
    mockInvoke.mockReturnValueOnce(new Promise(() => undefined))

    const { root, container, getResult } = renderHook()

    const result = getResult()
    expect(result?.loading).toBe(true)

    act(() => { root.unmount() })
    container.remove()
  })
})
