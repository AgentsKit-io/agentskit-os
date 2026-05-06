/**
 * Tests for DashboardsProvider / useDashboards().
 *
 * Covers:
 *   - Throws outside provider
 *   - Exposes all / active
 *   - create() adds a dashboard
 *   - switch() changes active
 *   - rename() renames
 *   - delete() removes
 *   - addWidget() by kind
 *   - reset()
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardsProvider, useDashboards } from '../dashboards-provider'
import type { DashboardsContextValue } from '../dashboards-provider'

// Keep localStorage isolated
beforeEach(() => {
  localStorage.clear()
})

function Inspector({ capture }: { capture: (ctx: DashboardsContextValue) => void }) {
  const ctx = useDashboards()
  capture(ctx)
  return null
}

function renderProvider(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  ctx: () => DashboardsContextValue
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let capturedCtx: DashboardsContextValue | undefined

  act(() => {
    root.render(
      createElement(
        DashboardsProvider,
        null,
        createElement(Inspector, { capture: (c) => { capturedCtx = c } }),
      ),
    )
  })

  return {
    container,
    root,
    ctx: () => capturedCtx!,
  }
}

describe('DashboardsProvider', () => {
  it('throws when useDashboards is called outside a provider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const Broken = () => {
      useDashboards()
      return null
    }
    expect(() => {
      act(() => {
        root.render(createElement(Broken))
      })
    }).toThrow('useDashboards must be used within a DashboardsProvider')
    act(() => root.unmount())
    container.remove()
  })

  it('exposes default dashboard on first render', () => {
    const { root, container, ctx } = renderProvider()
    expect(ctx().all).toHaveLength(1)
    expect(ctx().active.id).toBe('agentskitos.default')
    act(() => root.unmount())
    container.remove()
  })

  it('create() adds a dashboard and activates it', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().create('Second Board')
    })

    expect(ctx().all).toHaveLength(2)
    expect(ctx().active.name).toBe('Second Board')
    act(() => root.unmount())
    container.remove()
  })

  it('switch() changes the active dashboard', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().create('Board 2')
    })
    const board2Id = ctx().active.id

    act(() => {
      ctx().switch('agentskitos.default')
    })
    expect(ctx().active.id).toBe('agentskitos.default')

    act(() => {
      ctx().switch(board2Id)
    })
    expect(ctx().active.id).toBe(board2Id)

    act(() => root.unmount())
    container.remove()
  })

  it('rename() renames the dashboard', () => {
    const { root, container, ctx } = renderProvider()
    act(() => {
      ctx().rename('agentskitos.default', 'My Dashboard')
    })
    expect(ctx().all[0]?.name).toBe('My Dashboard')
    act(() => root.unmount())
    container.remove()
  })

  it('delete() removes a non-last dashboard', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().create('Temporary')
    })
    const tempId = ctx().active.id
    expect(ctx().all).toHaveLength(2)

    act(() => {
      ctx().delete(tempId)
    })
    expect(ctx().all).toHaveLength(1)
    act(() => root.unmount())
    container.remove()
  })

  it('delete() refuses to remove the last dashboard', () => {
    const { root, container, ctx } = renderProvider()
    act(() => {
      ctx().delete('agentskitos.default')
    })
    expect(ctx().all).toHaveLength(1)
    act(() => root.unmount())
    container.remove()
  })

  it('addWidget() by kind adds a widget to the active dashboard', () => {
    const { root, container, ctx } = renderProvider()
    const before = ctx().active.widgets.length
    act(() => {
      ctx().addWidget('cost-chart')
    })
    expect(ctx().active.widgets).toHaveLength(before + 1)
    expect(ctx().active.widgets.at(-1)?.kind).toBe('cost-chart')
    act(() => root.unmount())
    container.remove()
  })

  it('addWidget() with unknown kind is a noop', () => {
    const { root, container, ctx } = renderProvider()
    const before = ctx().active.widgets.length
    act(() => {
      ctx().addWidget('unknown-widget-xyz')
    })
    expect(ctx().active.widgets).toHaveLength(before)
    act(() => root.unmount())
    container.remove()
  })

  it('reset() restores the default state', () => {
    const { root, container, ctx } = renderProvider()
    act(() => {
      ctx().create('Extra')
    })
    expect(ctx().all).toHaveLength(2)
    act(() => {
      ctx().reset()
    })
    expect(ctx().all).toHaveLength(1)
    expect(ctx().active.id).toBe('agentskitos.default')
    act(() => root.unmount())
    container.remove()
  })
})
