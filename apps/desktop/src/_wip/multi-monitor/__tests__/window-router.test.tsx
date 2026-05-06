/**
 * Tests for WindowRouter.
 *
 * The component reads `window.location.search` to decide what to render.
 * We patch the query string before each test via `Object.defineProperty`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { WindowRouter } from '../window-router'

// ---------------------------------------------------------------------------
// Mock screens so we don't pull in real sidecar / Tauri calls
// ---------------------------------------------------------------------------

vi.mock('../../screens/dashboard', () => ({
  Dashboard: () => createElement('div', { 'data-testid': 'dashboard-screen' }, 'Dashboard'),
}))

vi.mock('../../screens/traces', () => ({
  TracesScreen: () => createElement('div', { 'data-testid': 'traces-screen' }, 'Traces'),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
  })
}

function renderRouter(search: string): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
} {
  setSearch(search)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(
        WindowRouter,
        null,
        createElement('div', { 'data-testid': 'main-shell' }, 'Main shell'),
      ),
    )
  })

  return { container, root }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WindowRouter', () => {
  afterEach(() => {
    setSearch('')
  })

  it('renders children when no ?screen= param is present', () => {
    const { container, root } = renderRouter('')
    expect(container.querySelector('[data-testid="main-shell"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="dashboard-screen"]')).toBeNull()
    act(() => { root.unmount() })
    container.remove()
  })

  it('renders Dashboard for ?screen=dashboard', () => {
    const { container, root } = renderRouter('?screen=dashboard')
    expect(container.querySelector('[data-testid="dashboard-screen"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="main-shell"]')).toBeNull()
    act(() => { root.unmount() })
    container.remove()
  })

  it('renders TracesScreen for ?screen=traces', () => {
    const { container, root } = renderRouter('?screen=traces')
    expect(container.querySelector('[data-testid="traces-screen"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="main-shell"]')).toBeNull()
    act(() => { root.unmount() })
    container.remove()
  })

  it('renders TracesScreen for ?screen=trace-detail', () => {
    const { container, root } = renderRouter('?screen=trace-detail')
    expect(container.querySelector('[data-testid="traces-screen"]')).not.toBeNull()
    act(() => { root.unmount() })
    container.remove()
  })

  it('renders children for an unknown ?screen= value', () => {
    const { container, root } = renderRouter('?screen=unknown-purpose')
    expect(container.querySelector('[data-testid="main-shell"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="dashboard-screen"]')).toBeNull()
    act(() => { root.unmount() })
    container.remove()
  })
})
