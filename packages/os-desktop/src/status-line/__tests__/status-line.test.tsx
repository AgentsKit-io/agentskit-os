/**
 * Tests for StatusLine component.
 *
 * Covers:
 *   - Renders nothing when visibleIds is empty
 *   - Renders each visible segment with the correct test-id
 *   - Does not render hidden segments
 *   - Renders the status bar role="status" element
 */

import { describe, it, expect, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { StatusLine } from '../status-line'
import { StatusLineProvider } from '../status-line-provider'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../lib/sidecar', () => ({
  subscribeEvents: vi.fn(() => () => undefined),
  getSidecarStatus: vi.fn().mockResolvedValue('disconnected'),
}))

// Mock useTheme
vi.mock('@agentskit/os-ui', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@agentskit/os-ui')>()
  return {
    ...mod,
    useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
  }
})

// Mock workspaces
vi.mock('../../workspaces/workspaces-provider', () => ({
  useWorkspaces: () => ({
    current: { id: 'ws-1', name: 'Test Workspace', status: 'idle' },
    all: [],
    switch: vi.fn(),
    status: 'ready',
  }),
}))

// Mock notifications
vi.mock('../../notifications/notifications-provider', () => ({
  useNotifications: () => ({
    unread: 0,
    items: [],
    push: vi.fn(),
    markRead: vi.fn(),
    clear: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    isOpen: false,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStatusLine(
  initialIds: string[],
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(
        StatusLineProvider,
        { initialIds },
        createElement(StatusLine, null),
      ),
    )
  })

  return { container, root }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusLine', () => {
  it('renders the status bar element when visibleIds is non-empty', () => {
    const { container, root } = renderStatusLine(['workspace'])
    const bar = container.querySelector('[data-testid="status-line"]')
    expect(bar).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('returns null / no status-line element when visibleIds is empty', () => {
    const { container, root } = renderStatusLine([])
    const bar = container.querySelector('[data-testid="status-line"]')
    expect(bar).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders a segment for each visible id', () => {
    const { container, root } = renderStatusLine(['workspace', 'theme', 'time'])
    expect(
      container.querySelector('[data-testid="status-segment-workspace"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="status-segment-theme"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="status-segment-time"]'),
    ).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('does not render a segment for hidden ids', () => {
    const { container, root } = renderStatusLine(['workspace'])
    expect(
      container.querySelector('[data-testid="status-segment-theme"]'),
    ).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('status bar has role="status" and aria-label', () => {
    const { container, root } = renderStatusLine(['time'])
    const bar = container.querySelector('[data-testid="status-line"]')
    expect(bar?.getAttribute('role')).toBe('status')
    expect(bar?.getAttribute('aria-label')).toBe('Status bar')
    act(() => root.unmount())
    container.remove()
  })
})
