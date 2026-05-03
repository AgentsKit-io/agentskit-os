/**
 * Tests for NotificationsProvider and useNotifications().
 *
 * Covers:
 *   - Context throws outside provider
 *   - Initial state: items=[], unread=0, isOpen=false
 *   - push() increments unread, open/close toggles isOpen
 *   - markRead() decrements unread
 *   - clear() empties items
 *   - Sidecar event bridge: error.* → push error, audit.flagged.* → push warning
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationsProvider, useNotifications } from '../notifications-provider'
import type { NotificationsContextValue } from '../types'

// ---------------------------------------------------------------------------
// Mock sidecar subscribeEvents
// ---------------------------------------------------------------------------

type EventHandler = (event: { type: string; data: Record<string, unknown> }) => void
let _subscribedHandler: EventHandler | null = null

vi.mock('../../lib/sidecar', () => ({
  subscribeEvents: vi.fn((handler: EventHandler) => {
    _subscribedHandler = handler
    return () => {
      _subscribedHandler = null
    }
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Inspector({
  capture,
}: {
  capture: (ctx: NotificationsContextValue) => void
}) {
  const ctx = useNotifications()
  capture(ctx)
  return null
}

function renderProvider(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  ctx: () => NotificationsContextValue
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let capturedCtx: NotificationsContextValue | undefined

  act(() => {
    root.render(
      createElement(
        NotificationsProvider,
        null,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    _subscribedHandler = null
  })

  it('throws when useNotifications is used outside a provider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Broken = () => {
      useNotifications()
      return null
    }

    expect(() => {
      act(() => {
        root.render(createElement(Broken, null))
      })
    }).toThrow('useNotifications must be used within a NotificationsProvider')

    act(() => root.unmount())
    container.remove()
  })

  it('provides initial state: empty items, unread=0, isOpen=false', () => {
    const { root, container, ctx } = renderProvider()

    expect(ctx().items).toHaveLength(0)
    expect(ctx().unread).toBe(0)
    expect(ctx().isOpen).toBe(false)

    act(() => root.unmount())
    container.remove()
  })

  it('push() adds item and increments unread', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().push({ severity: 'info', title: 'Hello' })
    })

    expect(ctx().items).toHaveLength(1)
    expect(ctx().unread).toBe(1)

    act(() => root.unmount())
    container.remove()
  })

  it('open() sets isOpen=true; close() sets isOpen=false', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().open())
    expect(ctx().isOpen).toBe(true)

    act(() => ctx().close())
    expect(ctx().isOpen).toBe(false)

    act(() => root.unmount())
    container.remove()
  })

  it('markRead() decrements unread', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().push({ severity: 'info', title: 'A' })
      ctx().push({ severity: 'info', title: 'B' })
    })
    expect(ctx().unread).toBe(2)

    const id = ctx().items[0]!.id
    act(() => ctx().markRead(id))
    expect(ctx().unread).toBe(1)

    act(() => root.unmount())
    container.remove()
  })

  it('clear() empties all notifications', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      ctx().push({ severity: 'warning', title: 'W1' })
      ctx().push({ severity: 'error', title: 'E1' })
    })
    expect(ctx().items).toHaveLength(2)

    act(() => ctx().clear())
    expect(ctx().items).toHaveLength(0)
    expect(ctx().unread).toBe(0)

    act(() => root.unmount())
    container.remove()
  })

  it('auto-pushes error notification on error.* sidecar events', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      _subscribedHandler?.({
        type: 'error.run_failed',
        data: { message: 'Agent crashed' },
      })
    })

    expect(ctx().items).toHaveLength(1)
    expect(ctx().items[0]?.severity).toBe('error')
    expect(ctx().items[0]?.title).toContain('error.run_failed')

    act(() => root.unmount())
    container.remove()
  })

  it('auto-pushes warning notification on audit.flagged.* events', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      _subscribedHandler?.({
        type: 'audit.flagged.pii_detected',
        data: { message: 'PII found in output' },
      })
    })

    expect(ctx().items).toHaveLength(1)
    expect(ctx().items[0]?.severity).toBe('warning')
    expect(ctx().items[0]?.title).toContain('audit.flagged.pii_detected')

    act(() => root.unmount())
    container.remove()
  })

  it('does not push notification for unrelated sidecar events', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      _subscribedHandler?.({
        type: 'run.started',
        data: {},
      })
    })

    expect(ctx().items).toHaveLength(0)

    act(() => root.unmount())
    container.remove()
  })

  it('uses message from data when available', () => {
    const { root, container, ctx } = renderProvider()

    act(() => {
      _subscribedHandler?.({
        type: 'error.timeout',
        data: { message: 'Request timed out after 30s' },
      })
    })

    expect(ctx().items[0]?.message).toBe('Request timed out after 30s')

    act(() => root.unmount())
    container.remove()
  })
})
