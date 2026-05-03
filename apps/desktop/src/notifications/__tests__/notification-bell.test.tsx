/**
 * Tests for NotificationBell component.
 *
 * Covers:
 *   - Renders a button with correct aria-label when no unread
 *   - Shows unread count badge when unread > 0
 *   - Hides badge when unread == 0
 *   - Clicking calls open() when panel is closed
 *   - Clicking calls close() when panel is open
 *   - Badge shows '99+' when unread > 99
 *   - aria-pressed reflects isOpen state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationBell } from '../notification-bell'
import type { NotificationsContextValue } from '../types'

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
// Helpers
// ---------------------------------------------------------------------------

function renderBell(): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(NotificationBell, null))
  })
  return { container, root }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationBell', () => {
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

  it('renders a button element', () => {
    const { container, root } = renderBell()
    const btn = container.querySelector('[data-testid="notification-bell"]')
    expect(btn?.tagName.toLowerCase()).toBe('button')
    act(() => root.unmount())
    container.remove()
  })

  it('has aria-label "Notifications" when unread is 0', () => {
    const { container, root } = renderBell()
    const btn = container.querySelector('[data-testid="notification-bell"]')
    expect(btn?.getAttribute('aria-label')).toBe('Notifications')
    act(() => root.unmount())
    container.remove()
  })

  it('includes unread count in aria-label when unread > 0', () => {
    _mockCtx = { ..._mockCtx, unread: 3 }
    const { container, root } = renderBell()
    const btn = container.querySelector('[data-testid="notification-bell"]')
    expect(btn?.getAttribute('aria-label')).toContain('3 unread')
    act(() => root.unmount())
    container.remove()
  })

  it('does not render badge when unread is 0', () => {
    const { container, root } = renderBell()
    const badge = container.querySelector('[data-testid="notification-badge"]')
    expect(badge).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders badge with count when unread > 0', () => {
    _mockCtx = { ..._mockCtx, unread: 5 }
    const { container, root } = renderBell()
    const badge = container.querySelector('[data-testid="notification-badge"]')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toBe('5')
    act(() => root.unmount())
    container.remove()
  })

  it('shows "99+" in badge when unread exceeds 99', () => {
    _mockCtx = { ..._mockCtx, unread: 142 }
    const { container, root } = renderBell()
    const badge = container.querySelector('[data-testid="notification-badge"]')
    expect(badge?.textContent).toBe('99+')
    act(() => root.unmount())
    container.remove()
  })

  it('calls open() when clicked and panel is closed', () => {
    const open = vi.fn()
    _mockCtx = { ..._mockCtx, isOpen: false, open }
    const { container, root } = renderBell()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="notification-bell"]')
    act(() => btn?.click())
    expect(open).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('calls close() when clicked and panel is open', () => {
    const close = vi.fn()
    _mockCtx = { ..._mockCtx, isOpen: true, close }
    const { container, root } = renderBell()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="notification-bell"]')
    act(() => btn?.click())
    expect(close).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('sets aria-pressed=true when panel is open', () => {
    _mockCtx = { ..._mockCtx, isOpen: true }
    const { container, root } = renderBell()
    const btn = container.querySelector('[data-testid="notification-bell"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
    act(() => root.unmount())
    container.remove()
  })

  it('sets aria-pressed=false when panel is closed', () => {
    _mockCtx = { ..._mockCtx, isOpen: false }
    const { container, root } = renderBell()
    const btn = container.querySelector('[data-testid="notification-bell"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
    act(() => root.unmount())
    container.remove()
  })
})
