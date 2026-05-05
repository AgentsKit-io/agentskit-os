/**
 * Tests for ShortcutProvider and useShortcuts hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { ShortcutProvider, useShortcuts } from '../shortcut-provider'
import { useShortcutHandler } from '../shortcut-handlers'
import type { ShortcutContextValue } from '../shortcut-provider'

// Stub os-ui
vi.mock('@agentskit/os-ui', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
  GlassPanel: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode
    className: string | undefined
    onClick: (() => void) | undefined
  }) =>
    createElement('div', { className, onClick, 'data-testid': 'glass-panel' }, children),
  Kbd: ({ children }: { children: React.ReactNode }) => createElement('kbd', {}, children),
}))

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
  window.dispatchEvent(e)
}

describe('ShortcutProvider / useShortcuts', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  it('throws when useShortcuts is used outside provider', () => {
    const Broken = () => {
      useShortcuts()
      return null
    }
    expect(() => {
      act(() => { root.render(createElement(Broken, null)) })
    }).toThrow('useShortcuts must be used within a ShortcutProvider')
  })

  it('provides all 13 built-in shortcuts', () => {
    let ctx: ShortcutContextValue | undefined

    const Inspector = () => {
      ctx = useShortcuts()
      return null
    }

    act(() => {
      root.render(
        createElement(ShortcutProvider, null, createElement(Inspector, null)),
      )
    })

    expect(ctx?.all).toHaveLength(13)
  })

  it('get returns the correct shortcut', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })
    const s = ctx?.get('palette.toggle')
    expect(s?.defaultBinding).toBe('meta+k')
  })

  it('override changes a binding', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })

    act(() => { ctx?.override('palette.toggle', 'ctrl+k') })
    expect(ctx?.get('palette.toggle')?.defaultBinding).toBe('ctrl+k')
  })

  it('reset reverts an override', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })

    act(() => { ctx?.override('palette.toggle', 'ctrl+k') })
    act(() => { ctx?.reset('palette.toggle') })
    expect(ctx?.get('palette.toggle')?.defaultBinding).toBe('meta+k')
  })

  it('resetAll clears all overrides', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })

    act(() => {
      ctx?.override('palette.toggle', 'ctrl+k')
      ctx?.override('nav.dashboard', 'ctrl+1')
    })
    act(() => { ctx?.resetAll() })
    expect(ctx?.get('palette.toggle')?.defaultBinding).toBe('meta+k')
    expect(ctx?.get('nav.dashboard')?.defaultBinding).toBe('meta+1')
  })

  it('detects conflicts when two shortcuts share a binding', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })

    // Override nav.dashboard to conflict with palette.toggle
    act(() => { ctx?.override('nav.dashboard', 'meta+k') })
    expect(ctx?.conflicts.length).toBeGreaterThan(0)
    const ids = ctx?.conflicts.flatMap((pair) => [...pair]) ?? []
    expect(ids).toContain('palette.toggle')
    expect(ids).toContain('nav.dashboard')
  })

  it('has no conflicts with default bindings', () => {
    let ctx: ShortcutContextValue | undefined
    const Inspector = () => { ctx = useShortcuts(); return null }
    act(() => { root.render(createElement(ShortcutProvider, null, createElement(Inspector, null))) })
    expect(ctx?.conflicts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// useShortcutHandler
// ---------------------------------------------------------------------------

describe('useShortcutHandler', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  it('calls the handler when the bound key is pressed', () => {
    const handler = vi.fn()

    const Comp = () => {
      useShortcutHandler('palette.toggle', handler)
      return null
    }

    act(() => {
      root.render(createElement(ShortcutProvider, null, createElement(Comp, null)))
    })

    act(() => { fireKeyDown('k', { metaKey: true }) })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not call handler after unmount', () => {
    const handler = vi.fn()

    const Comp = () => {
      useShortcutHandler('palette.toggle', handler)
      return null
    }

    act(() => {
      root.render(createElement(ShortcutProvider, null, createElement(Comp, null)))
    })
    act(() => { root.unmount() })
    root = createRoot(container)
    act(() => { fireKeyDown('k', { metaKey: true }) })
    expect(handler).not.toHaveBeenCalled()
  })
})
