import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn(),
}))

import { sidecarRequest } from '../../lib/sidecar'
import { useAppUpdater } from '../use-app-updater'

describe('useAppUpdater', () => {
  beforeEach(() => {
    vi.mocked(sidecarRequest).mockReset()
  })

  it('starts idle', () => {
    const { result } = renderHook(() => useAppUpdater())
    expect(result.current.status).toEqual({ kind: 'idle' })
  })

  it('reports up-to-date when no update is available', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({ hasUpdate: false })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.checkForUpdates()
    })
    expect(result.current.status).toEqual({ kind: 'up-to-date' })
  })

  it('reports available with version + notes', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({
      hasUpdate: true,
      version: '1.2.3',
      notes: 'bugfixes',
    })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.checkForUpdates()
    })
    expect(result.current.status).toEqual({
      kind: 'available',
      version: '1.2.3',
      notes: 'bugfixes',
    })
  })

  it('reports error on malformed check response', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({ unexpected: true })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.checkForUpdates()
    })
    expect(result.current.status).toEqual({ kind: 'error', message: 'invalid check response' })
  })

  it('reports downloading progress', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({
      version: '1.2.3',
      progress: 0.42,
      done: false,
    })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.downloadUpdate()
    })
    expect(result.current.status).toEqual({
      kind: 'downloading',
      version: '1.2.3',
      progress: 0.42,
    })
  })

  it('transitions to ready when download completes', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({
      version: '1.2.3',
      progress: 1,
      done: true,
    })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.downloadUpdate()
    })
    expect(result.current.status).toEqual({ kind: 'ready', version: '1.2.3' })
  })

  it('reports installed after install', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({ version: '1.2.3' })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.installUpdate()
    })
    expect(result.current.status).toEqual({ kind: 'installed', version: '1.2.3' })
  })

  it('reports rolled-back with previous version', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({ previousVersion: '1.2.2' })
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.rollback()
    })
    expect(result.current.status).toEqual({ kind: 'rolled-back', previousVersion: '1.2.2' })
  })

  it('captures sidecar errors', async () => {
    vi.mocked(sidecarRequest).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useAppUpdater())
    await act(async () => {
      await result.current.checkForUpdates()
    })
    expect(result.current.status).toEqual({ kind: 'error', message: 'boom' })
  })

  it('auto-checks when enabled', async () => {
    vi.mocked(sidecarRequest).mockResolvedValueOnce({ hasUpdate: false })
    const { result } = renderHook(() => useAppUpdater({ autoCheck: true }))
    await waitFor(() => {
      expect(result.current.status).toEqual({ kind: 'up-to-date' })
    })
  })
})
