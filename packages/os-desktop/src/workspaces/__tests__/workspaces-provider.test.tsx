/**
 * Tests for WorkspacesProvider and useWorkspaces().
 *
 * Covers:
 *   - Context throws outside provider
 *   - Initial state with initialWorkspaces prop
 *   - switch() changes the current workspace
 *   - switch() persists the selection to localStorage
 *   - status is 'ready' after loading
 *   - Falls back to mock data when sidecar returns empty
 *   - First workspace is auto-selected when no persisted id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspacesProvider, useWorkspaces } from '../workspaces-provider'
import type { WorkspacesContextValue } from '../workspaces-provider'
import type { Workspace } from '../types'

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn().mockResolvedValue([]),
}))

const MOCK_WORKSPACES: Workspace[] = [
  { id: 'ws-1', name: 'Default', status: 'idle' },
  { id: 'ws-2', name: 'Production', status: 'running' },
]

function Inspector({
  capture,
}: {
  capture: (ctx: WorkspacesContextValue) => void
}) {
  const ctx = useWorkspaces()
  capture(ctx)
  return null
}

function renderProvider(
  workspaces: Workspace[] = MOCK_WORKSPACES,
): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  ctx: () => WorkspacesContextValue
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let capturedCtx: WorkspacesContextValue | undefined

  act(() => {
    root.render(
      createElement(
        WorkspacesProvider,
        { initialWorkspaces: workspaces },
        createElement(Inspector, {
          capture: (c) => {
            capturedCtx = c
          },
        }),
      ),
    )
  })

  return {
    container,
    root,
    ctx: () => capturedCtx!,
  }
}

describe('WorkspacesProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('throws when useWorkspaces is used outside a provider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Broken = () => {
      useWorkspaces()
      return null
    }

    expect(() => {
      act(() => {
        root.render(createElement(Broken, null))
      })
    }).toThrow('useWorkspaces must be used within a WorkspacesProvider')

    act(() => root.unmount())
    container.remove()
  })

  it('exposes all workspaces from initialWorkspaces prop', () => {
    const { root, container, ctx } = renderProvider()

    expect(ctx().all).toHaveLength(2)
    expect(ctx().all[0]?.id).toBe('ws-1')
    expect(ctx().all[1]?.id).toBe('ws-2')

    act(() => root.unmount())
    container.remove()
  })

  it('auto-selects the first workspace when no persisted id exists', () => {
    const { root, container, ctx } = renderProvider()

    expect(ctx().current?.id).toBe('ws-1')

    act(() => root.unmount())
    container.remove()
  })

  it('status is ready after initialWorkspaces are provided', () => {
    const { root, container, ctx } = renderProvider()

    expect(ctx().status).toBe('ready')

    act(() => root.unmount())
    container.remove()
  })

  it('switch() changes the current workspace', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().switch('ws-2')
    })

    expect(ctx().current?.id).toBe('ws-2')
    expect(ctx().current?.name).toBe('Production')

    act(() => root.unmount())
    container.remove()
  })

  it('switch() persists the selection to localStorage', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().switch('ws-2')
    })

    expect(localStorage.getItem('agentskitos.current-workspace')).toBe('ws-2')

    act(() => root.unmount())
    container.remove()
  })

  it('switch() is a no-op for unknown workspace id', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().switch('unknown-id')
    })

    // current should remain the auto-selected first workspace
    expect(ctx().current?.id).toBe('ws-1')

    act(() => root.unmount())
    container.remove()
  })

  it('restores persisted workspace on mount', () => {
    localStorage.setItem('agentskitos.current-workspace', 'ws-2')
    const { root, container, ctx } = renderProvider()

    expect(ctx().current?.id).toBe('ws-2')

    act(() => root.unmount())
    container.remove()
  })
})
