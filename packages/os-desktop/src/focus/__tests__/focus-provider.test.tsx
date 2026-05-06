/**
 * Tests for FocusProvider and useFocus hook.
 *
 * Covers:
 *   - Default inactive state
 *   - toggle / enable / disable via context
 *   - Global Cmd/Ctrl+Shift+. keyboard shortcut
 *   - Persisted initial state from localStorage
 *   - "Toggle focus mode" command registered in the command palette
 *   - Error when useFocus is used outside provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { FocusProvider, useFocus } from '../focus-provider'
import {
  CommandPaletteProvider,
  useCommandPalette,
  type CommandPaletteContextValue,
} from '../../command-palette/command-palette-provider'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => {
  let _theme = 'dark'
  const setTheme = (t: string) => { _theme = t }
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({ theme: _theme, resolvedTheme: _theme, setTheme }),
    Kbd: ({ children }: { children: React.ReactNode }) =>
      createElement('kbd', {}, children),
  }
})

vi.mock('../../lib/sidecar', () => ({
  pauseRuns: vi.fn().mockResolvedValue(undefined),
  resumeRuns: vi.fn().mockResolvedValue(undefined),
}))

const STORAGE_KEY = 'agentskitos.focus-mode'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
  window.dispatchEvent(event)
}

/**
 * Renders a component tree with CommandPaletteProvider + FocusProvider.
 * Returns the container and a cleanup function.
 */
function renderTree(child: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(
        CommandPaletteProvider,
        null,
        createElement(FocusProvider, null, child),
      ),
    )
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFocus', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  it('throws when used outside FocusProvider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Broken = () => {
      useFocus()
      return null
    }

    expect(() => {
      act(() => { root.render(createElement(Broken, null)) })
    }).toThrow('useFocus must be used within a FocusProvider')

    act(() => { root.unmount() })
    container.remove()
  })

  it('starts inactive by default', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))
    expect(ctx?.active).toBe(false)
    unmount()
  })

  it('restores persisted true state on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'true')

    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))
    expect(ctx?.active).toBe(true)
    unmount()
  })

  it('enable() sets active to true and persists', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))

    act(() => { ctx?.enable() })
    expect(ctx?.active).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')

    unmount()
  })

  it('disable() sets active to false and persists', () => {
    localStorage.setItem(STORAGE_KEY, 'true')

    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))
    expect(ctx?.active).toBe(true)

    act(() => { ctx?.disable() })
    expect(ctx?.active).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')

    unmount()
  })

  it('toggle() flips active state and persists', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))
    expect(ctx?.active).toBe(false)

    act(() => { ctx?.toggle() })
    expect(ctx?.active).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')

    act(() => { ctx?.toggle() })
    expect(ctx?.active).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')

    unmount()
  })

  it('toggles on Cmd+Shift+. (metaKey)', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))
    expect(ctx?.active).toBe(false)

    act(() => { fireKeyDown('.', { metaKey: true, shiftKey: true }) })
    expect(ctx?.active).toBe(true)

    act(() => { fireKeyDown('.', { metaKey: true, shiftKey: true }) })
    expect(ctx?.active).toBe(false)

    unmount()
  })

  it('toggles on Ctrl+Shift+. (ctrlKey)', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))

    act(() => { fireKeyDown('.', { ctrlKey: true, shiftKey: true }) })
    expect(ctx?.active).toBe(true)

    unmount()
  })

  it('does not toggle on Cmd+. without Shift', () => {
    let ctx: ReturnType<typeof useFocus> | undefined

    const Inspector = () => {
      ctx = useFocus()
      return null
    }

    const { unmount } = renderTree(createElement(Inspector, null))

    act(() => { fireKeyDown('.', { metaKey: true }) })
    expect(ctx?.active).toBe(false)

    unmount()
  })
})

describe('FocusProvider command palette registration', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  it('registers "Toggle focus mode" command in the palette', () => {
    let palettCtx: CommandPaletteContextValue | undefined

    const Inspector = () => {
      palettCtx = useCommandPalette()
      return null
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        createElement(
          CommandPaletteProvider,
          null,
          createElement(
            FocusProvider,
            null,
            createElement(Inspector, null),
          ),
        ),
      )
    })

    expect(palettCtx?.commands.some((c) => c.id === 'view.toggle-focus')).toBe(true)
    expect(palettCtx?.commands.find((c) => c.id === 'view.toggle-focus')?.label).toBe(
      'Toggle focus mode',
    )

    act(() => { root.unmount() })
    container.remove()
  })
})
