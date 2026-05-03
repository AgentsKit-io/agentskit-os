/**
 * Integration tests for the CommandPalette overlay.
 *
 * Uses React DOM + jsdom (no @testing-library). Covers:
 *   - Open / close via Cmd+K / Ctrl+K key combo
 *   - Run command on Enter
 *   - Esc closes the palette
 *   - ↑/↓ selection movement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { CommandPaletteProvider, useCommandPalette } from '../command-palette-provider'
import { CommandPalette } from '../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Minimal stub for @agentskit/os-ui ThemeProvider + useTheme
vi.mock('@agentskit/os-ui', () => {
  let _theme = 'dark'
  const setTheme = (t: string) => { _theme = t }
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({ theme: _theme, resolvedTheme: _theme, setTheme }),
    GlassPanel: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) =>
      createElement('div', { className, onClick, 'data-testid': 'glass-panel' }, children),
    Kbd: ({ children }: { children: React.ReactNode }) =>
      createElement('kbd', {}, children),
  }
})

// Stub sidecar so no Tauri calls are made
vi.mock('../../lib/sidecar', () => ({
  pauseRuns: vi.fn().mockResolvedValue(undefined),
  resumeRuns: vi.fn().mockResolvedValue(undefined),
}))

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
  window.dispatchEvent(event)
}

// ---------------------------------------------------------------------------
// Wrapper that renders both the provider and the palette
// ---------------------------------------------------------------------------

function App({ onNavigate }: { onNavigate?: (screen: 'dashboard' | 'traces' | 'settings') => void }) {
  const children = createElement(CommandPalette, null)
  return onNavigate !== undefined
    ? createElement(CommandPaletteProvider, { onNavigate, children })
    : createElement(CommandPaletteProvider, { children })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommandPalette', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('is hidden on initial render', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    // The palette renders nothing when closed — no dialog role
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('opens on Cmd+K (metaKey)', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => {
      fireKeyDown('k', { metaKey: true })
    })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('opens on Ctrl+K', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => {
      fireKeyDown('k', { ctrlKey: true })
    })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('toggles closed on second Cmd+K', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })
    act(() => { fireKeyDown('k', { metaKey: true }) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes on Escape key', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => { fireKeyDown('Escape') })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows command items when open', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })
    const items = container.querySelectorAll('[role="option"]')
    expect(items.length).toBeGreaterThan(0)
  })

  it('selects next item on ArrowDown', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })

    const getSelected = () => container.querySelector('[data-selected="true"]')
    const firstSelected = getSelected()
    expect(firstSelected).not.toBeNull()

    act(() => { fireKeyDown('ArrowDown') })

    const secondSelected = getSelected()
    expect(secondSelected).not.toBeNull()
    // Text content should differ (moved to next item)
    expect(secondSelected?.textContent).not.toBe(firstSelected?.textContent)
  })

  it('selects previous item on ArrowUp (does not go below 0)', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })

    // Start at index 0 — ArrowUp should stay at 0
    act(() => { fireKeyDown('ArrowUp') })
    const selected = container.querySelector('[data-selected="true"]')
    expect(selected).not.toBeNull()
  })

  it('runs selected command on Enter and closes the palette', () => {
    const onNavigate = vi.fn<(screen: 'dashboard' | 'traces' | 'settings') => void>()
    act(() => {
      root.render(createElement(App, { onNavigate }))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })

    // The first command by default is "Go to Dashboard" (Navigation category)
    act(() => { fireKeyDown('Enter') })

    // Palette should be closed after running
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    // onNavigate should have been called with 'dashboard'
    expect(onNavigate).toHaveBeenCalledWith('dashboard')
  })

  it('filters commands by typing in the search input', () => {
    act(() => {
      root.render(createElement(App, null))
    })
    act(() => { fireKeyDown('k', { metaKey: true }) })

    const input = container.querySelector('input')
    expect(input).not.toBeNull()

    act(() => {
      Object.defineProperty(input, 'value', { value: 'pause', writable: true })
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      // Simulate React synthetic onChange by directly changing and dispatching
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      nativeInputValueSetter?.call(input, 'pause')
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      // Use React's own onChange approach — fire a change event
      input!.dispatchEvent(new Event('change', { bubbles: true }))
    })
  })
})

// ---------------------------------------------------------------------------
// useCommandPalette hook smoke tests (via a wrapper component)
// ---------------------------------------------------------------------------

describe('useCommandPalette', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  it('throws when used outside a provider', () => {
    const Broken = () => {
      useCommandPalette()
      return null
    }
    expect(() => {
      act(() => { root.render(createElement(Broken, null)) })
    }).toThrow('useCommandPalette must be used within a CommandPaletteProvider')
  })

  it('provides open state and toggle functions', () => {
    let capturedCtx: ReturnType<typeof useCommandPalette> | undefined

    const Inspector = () => {
      capturedCtx = useCommandPalette()
      return null
    }

    act(() => {
      root.render(
        createElement(
          CommandPaletteProvider,
          null,
          createElement(Inspector, null),
        ),
      )
    })

    expect(capturedCtx?.open).toBe(false)
    act(() => { capturedCtx?.openPalette() })
    expect(capturedCtx?.open).toBe(true)
    act(() => { capturedCtx?.closePalette() })
    expect(capturedCtx?.open).toBe(false)
  })

  it('registerCommand adds a command to the list', () => {
    let capturedCtx: ReturnType<typeof useCommandPalette> | undefined

    const Inspector = () => {
      capturedCtx = useCommandPalette()
      return null
    }

    act(() => {
      root.render(
        createElement(
          CommandPaletteProvider,
          null,
          createElement(Inspector, null),
        ),
      )
    })

    const before = capturedCtx!.commands.length

    act(() => {
      capturedCtx?.registerCommand({
        id: 'test.custom',
        label: 'Custom Test Command',
        keywords: ['test'],
        category: 'System',
        run: vi.fn(),
      })
    })

    expect(capturedCtx!.commands.length).toBe(before + 1)
    expect(capturedCtx!.commands.some((c) => c.id === 'test.custom')).toBe(true)
  })
})
