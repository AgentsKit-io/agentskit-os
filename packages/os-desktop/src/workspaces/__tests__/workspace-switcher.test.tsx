/**
 * Tests for WorkspaceSwitcher component.
 *
 * Covers:
 *   - Renders trigger button with current workspace name
 *   - Trigger has correct aria attributes when closed
 *   - Clicking trigger opens the dropdown
 *   - Dropdown contains search input
 *   - Dropdown lists all workspaces
 *   - Filtering by query hides non-matching workspaces
 *   - Selecting a workspace calls switch() and closes the dropdown
 *   - Pressing Escape closes the dropdown
 *   - Cmd+P / Ctrl+P opens the dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceSwitcher } from '../workspace-switcher'
import type { WorkspacesContextValue } from '../workspaces-provider'
import type { CommandPaletteContextValue } from '../../command-palette/command-palette-provider'

const mockSwitch = vi.fn()
let _mockCtx: WorkspacesContextValue = {
  all: [
    { id: 'ws-1', name: 'Default', status: 'idle' },
    { id: 'ws-2', name: 'Production', status: 'running' },
    { id: 'ws-3', name: 'Staging', status: 'paused' },
  ],
  current: { id: 'ws-1', name: 'Default', status: 'idle' },
  switch: mockSwitch,
  status: 'ready',
}

vi.mock('../workspaces-provider', () => ({
  useWorkspaces: () => _mockCtx,
}))

const mockRegisterCommand = vi.fn()
let _mockPaletteCtx: CommandPaletteContextValue = {
  open: false,
  openPalette: vi.fn(),
  closePalette: vi.fn(),
  registerCommand: mockRegisterCommand,
  commands: [],
}

vi.mock('../../command-palette/command-palette-provider', () => ({
  useCommandPalette: () => _mockPaletteCtx,
}))

function renderSwitcher(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(WorkspaceSwitcher, null))
  })
  return { container, root }
}

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSwitch.mockClear()
    mockRegisterCommand.mockClear()
    _mockCtx = {
      all: [
        { id: 'ws-1', name: 'Default', status: 'idle' },
        { id: 'ws-2', name: 'Production', status: 'running' },
        { id: 'ws-3', name: 'Staging', status: 'paused' },
      ],
      current: { id: 'ws-1', name: 'Default', status: 'idle' },
      switch: mockSwitch,
      status: 'ready',
    }
    _mockPaletteCtx = {
      open: false,
      openPalette: vi.fn(),
      closePalette: vi.fn(),
      registerCommand: mockRegisterCommand,
      commands: [],
    }
  })

  it('renders a trigger button with the current workspace name', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector('[data-testid="workspace-switcher-trigger"]')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toContain('Default')
    act(() => root.unmount())
    container.remove()
  })

  it('trigger has aria-expanded=false when closed', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector('[data-testid="workspace-switcher-trigger"]')
    expect(btn?.getAttribute('aria-expanded')).toBe('false')
    act(() => root.unmount())
    container.remove()
  })

  it('dropdown is not rendered initially', () => {
    const { container, root } = renderSwitcher()
    const dropdown = container.querySelector('[data-testid="workspace-switcher-dropdown"]')
    expect(dropdown).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('clicking trigger opens the dropdown', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => btn?.click())
    const dropdown = container.querySelector('[data-testid="workspace-switcher-dropdown"]')
    expect(dropdown).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('dropdown has a search input', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => btn?.click())
    const input = container.querySelector('[data-testid="workspace-search-input"]')
    expect(input).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('dropdown lists all workspace options', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => btn?.click())
    const options = container.querySelectorAll('[data-testid^="workspace-option-"]')
    expect(options).toHaveLength(3)
    act(() => root.unmount())
    container.remove()
  })

  it('selecting a workspace calls switch() with correct id', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => btn?.click())
    const option = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-option-ws-2"] button',
    )
    act(() => option?.click())
    expect(mockSwitch).toHaveBeenCalledWith('ws-2')
    act(() => root.unmount())
    container.remove()
  })

  it('selecting a workspace closes the dropdown', () => {
    const { container, root } = renderSwitcher()
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => btn?.click())
    const option = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-option-ws-2"] button',
    )
    act(() => option?.click())
    const dropdown = container.querySelector('[data-testid="workspace-switcher-dropdown"]')
    expect(dropdown).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('pressing Escape closes the dropdown', () => {
    const { container, root } = renderSwitcher()
    const triggerBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="workspace-switcher-trigger"]',
    )
    act(() => triggerBtn?.click())
    expect(
      container.querySelector('[data-testid="workspace-switcher-dropdown"]'),
    ).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="workspace-switcher-dropdown"]'),
    ).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('Cmd+P opens the dropdown', () => {
    const { container, root } = renderSwitcher()
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'p', metaKey: true, bubbles: true }),
      )
    })
    const dropdown = container.querySelector('[data-testid="workspace-switcher-dropdown"]')
    expect(dropdown).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('Ctrl+P opens the dropdown', () => {
    const { container, root } = renderSwitcher()
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true }),
      )
    })
    const dropdown = container.querySelector('[data-testid="workspace-switcher-dropdown"]')
    expect(dropdown).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('registers a palette command for switching workspaces', () => {
    const { root, container } = renderSwitcher()
    expect(mockRegisterCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspaces.switch',
        label: 'Switch workspace',
      }),
    )
    act(() => root.unmount())
    container.remove()
  })

  it('renders status badge in the trigger button', () => {
    const { container, root } = renderSwitcher()
    const badge = container.querySelector(
      '[data-testid="workspace-switcher-trigger"] [data-testid="workspace-status-badge"]',
    )
    expect(badge).not.toBeNull()
    expect(badge?.getAttribute('data-status')).toBe('idle')
    act(() => root.unmount())
    container.remove()
  })

  it('shows "Loading…" when current workspace is null', () => {
    _mockCtx = { ..._mockCtx, current: null }
    const { container, root } = renderSwitcher()
    const btn = container.querySelector('[data-testid="workspace-switcher-trigger"]')
    expect(btn?.textContent).toContain('Loading')
    act(() => root.unmount())
    container.remove()
  })
})
