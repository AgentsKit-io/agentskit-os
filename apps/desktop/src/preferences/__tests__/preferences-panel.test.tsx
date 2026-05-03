/**
 * Tests for PreferencesPanel component.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders modal when isOpen=true
 *   - Close button calls onClose
 *   - Backdrop click calls onClose
 *   - Tab navigation switches content
 *   - Save button calls set() and onClose
 *   - Cancel button calls onClose without saving
 *   - Reset button calls reset()
 *   - Draft changes do not commit until Save
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { PreferencesPanel } from '../preferences-panel'
import type { PreferencesContextValue } from '../preferences-provider'
import { DEFAULT_PREFERENCES } from '../preferences-types'

// ---------------------------------------------------------------------------
// Mocks
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

let _mockCtx: PreferencesContextValue = {
  prefs: { ...DEFAULT_PREFERENCES },
  set: vi.fn(),
  reset: vi.fn(),
  exportJson: vi.fn(() => JSON.stringify(DEFAULT_PREFERENCES)),
  importJson: vi.fn(),
}

vi.mock('../preferences-provider', () => ({
  usePreferences: () => _mockCtx,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPanel(
  overrides: Partial<{ isOpen: boolean; onClose: () => void; onOpenShortcuts: () => void }> = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(PreferencesPanel, {
        isOpen: overrides.isOpen ?? true,
        onClose,
        onOpenShortcuts: overrides.onOpenShortcuts,
      }),
    )
  })

  return { container, root, onClose }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PreferencesPanel', () => {
  beforeEach(() => {
    _mockCtx = {
      prefs: { ...DEFAULT_PREFERENCES },
      set: vi.fn(),
      reset: vi.fn(),
      exportJson: vi.fn(() => JSON.stringify(DEFAULT_PREFERENCES)),
      importJson: vi.fn(),
    }
  })

  it('renders nothing when isOpen=false', () => {
    const { container, root } = renderPanel({ isOpen: false })
    expect(container.querySelector('[data-testid="preferences-panel"]')).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders the modal when isOpen=true', () => {
    const { container, root } = renderPanel({ isOpen: true })
    expect(container.querySelector('[data-testid="preferences-panel"]')).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="close-preferences"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="cancel-preferences"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('calls set() and onClose when Save is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="save-preferences"]')
    act(() => btn?.click())
    expect(_mockCtx.set).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('calls reset() when Reset to defaults is clicked', () => {
    const { container, root } = renderPanel()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="reset-preferences"]')
    act(() => btn?.click())
    expect(_mockCtx.reset).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('switches to Accessibility tab when tab is clicked', () => {
    const { container, root } = renderPanel()
    const tabBtn = container.querySelector<HTMLButtonElement>('[data-testid="tab-accessibility"]')
    act(() => tabBtn?.click())
    // Accessibility tab content should be visible
    expect(container.querySelector('[data-testid="toggle-reduced-motion"]')).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('switches to Telemetry tab when tab is clicked', () => {
    const { container, root } = renderPanel()
    const tabBtn = container.querySelector<HTMLButtonElement>('[data-testid="tab-telemetry"]')
    act(() => tabBtn?.click())
    expect(container.querySelector('[data-testid="toggle-telemetry"]')).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('shows Shortcuts tab content with open shortcuts button when callback provided', () => {
    const onOpenShortcuts = vi.fn()
    const { container, root } = renderPanel({ onOpenShortcuts })
    const tabBtn = container.querySelector<HTMLButtonElement>('[data-testid="tab-shortcuts"]')
    act(() => tabBtn?.click())
    const shortcutsBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="open-shortcuts-btn"]',
    )
    expect(shortcutsBtn).not.toBeNull()
    act(() => shortcutsBtn?.click())
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('shows General tab by default', () => {
    const { container, root } = renderPanel()
    // General tab has density buttons
    expect(container.querySelector('[data-testid="density-compact"]')).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('does not call set() when Cancel is clicked (draft discarded)', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    // Change density in draft
    const densityBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="density-compact"]',
    )
    act(() => densityBtn?.click())
    // Cancel without saving
    const cancelBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="cancel-preferences"]',
    )
    act(() => cancelBtn?.click())
    // set() should NOT have been called
    expect(_mockCtx.set).not.toHaveBeenCalled()
    act(() => root.unmount())
    container.remove()
  })
})
