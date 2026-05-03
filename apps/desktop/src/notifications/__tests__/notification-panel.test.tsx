/**
 * Tests for NotificationPanel component.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders panel when isOpen=true
 *   - Shows empty state when no items
 *   - Renders notification items
 *   - Groups notifications by severity
 *   - "Clear all" button calls clear()
 *   - Close button calls close()
 *   - Shows unread count in header
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationPanel } from '../notification-panel'
import type { Notification, NotificationsContextValue } from '../types'

// ---------------------------------------------------------------------------
// Mock os-ui
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  GlassPanel: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => createElement('div', { className, ...props }, children),
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    [key: string]: unknown
  }) => createElement('button', { onClick, ...props }, children),
}))

// ---------------------------------------------------------------------------
// Mock the notifications provider
// ---------------------------------------------------------------------------

let _mockCtx: NotificationsContextValue = {
  items: [],
  unread: 0,
  push: vi.fn(),
  markRead: vi.fn(),
  clear: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  isOpen: false,
}

vi.mock('../notifications-provider', () => ({
  useNotifications: () => _mockCtx,
}))

// ---------------------------------------------------------------------------
// Mock notification-item to simplify
// ---------------------------------------------------------------------------

vi.mock('../notification-item', () => ({
  NotificationItem: ({ notification }: { notification: Notification }) =>
    createElement(
      'div',
      { 'data-testid': 'notification-item', 'data-severity': notification.severity },
      notification.title,
    ),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: Math.random().toString(36).slice(2),
    severity: 'info',
    title: 'Test notification',
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  }
}

function renderPanel(): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(NotificationPanel, null))
  })
  return { container, root }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationPanel', () => {
  beforeEach(() => {
    _mockCtx = {
      items: [],
      unread: 0,
      push: vi.fn(),
      markRead: vi.fn(),
      clear: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
      isOpen: false,
    }
  })

  it('renders nothing when isOpen is false', () => {
    const { container, root } = renderPanel()
    const panel = container.querySelector('[data-testid="notification-panel"]')
    expect(panel).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders the panel when isOpen is true', () => {
    _mockCtx = { ..._mockCtx, isOpen: true }
    const { container, root } = renderPanel()
    const panel = container.querySelector('[data-testid="notification-panel"]')
    expect(panel).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('shows empty-state message when there are no items', () => {
    _mockCtx = { ..._mockCtx, isOpen: true }
    const { container, root } = renderPanel()
    expect(container.textContent).toContain('No notifications')
    act(() => root.unmount())
    container.remove()
  })

  it('renders notification items when items exist', () => {
    _mockCtx = {
      ..._mockCtx,
      isOpen: true,
      items: [makeNotification({ title: 'N1' }), makeNotification({ title: 'N2' })],
    }
    const { container, root } = renderPanel()
    const items = container.querySelectorAll('[data-testid="notification-item"]')
    expect(items).toHaveLength(2)
    act(() => root.unmount())
    container.remove()
  })

  it('groups notifications by severity with labels', () => {
    _mockCtx = {
      ..._mockCtx,
      isOpen: true,
      items: [
        makeNotification({ severity: 'error', title: 'Err1' }),
        makeNotification({ severity: 'warning', title: 'Warn1' }),
        makeNotification({ severity: 'info', title: 'Info1' }),
      ],
    }
    const { container, root } = renderPanel()
    const text = container.textContent ?? ''
    expect(text).toContain('Errors')
    expect(text).toContain('Warnings')
    expect(text).toContain('Info')
    act(() => root.unmount())
    container.remove()
  })

  it('displays unread count badge in header when unread > 0', () => {
    _mockCtx = { ..._mockCtx, isOpen: true, unread: 4 }
    const { container, root } = renderPanel()
    expect(container.textContent).toContain('4')
    act(() => root.unmount())
    container.remove()
  })

  it('calls clear() when "Clear all" button is clicked', () => {
    const clear = vi.fn()
    _mockCtx = {
      ..._mockCtx,
      isOpen: true,
      items: [makeNotification()],
      clear,
    }
    const { container, root } = renderPanel()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="clear-notifications"]')
    act(() => btn?.click())
    expect(clear).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('calls close() when close button is clicked', () => {
    const close = vi.fn()
    _mockCtx = { ..._mockCtx, isOpen: true, close }
    const { container, root } = renderPanel()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="close-panel"]')
    act(() => btn?.click())
    expect(close).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('does not show "Clear all" when items list is empty', () => {
    _mockCtx = { ..._mockCtx, isOpen: true, items: [] }
    const { container, root } = renderPanel()
    const btn = container.querySelector('[data-testid="clear-notifications"]')
    expect(btn).toBeNull()
    act(() => root.unmount())
    container.remove()
  })
})
