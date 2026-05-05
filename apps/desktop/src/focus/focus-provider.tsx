/**
 * FocusProvider — focus-mode context.
 *
 * Exposes `useFocus()` returning `{ active, toggle, enable, disable }`.
 * Listens for Cmd/Ctrl+Shift+. globally and toggles focus mode.
 * Persists state via localStorage.
 * Registers a "Toggle focus mode" command in the command palette.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCommandPalette } from '../command-palette/command-palette-provider'
import { getFocusMode, setFocusMode } from './use-focus-store'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type FocusContextValue = {
  active: boolean
  toggle: () => void
  enable: () => void
  disable: () => void
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined)

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext)
  if (!ctx) {
    throw new Error('useFocus must be used within a FocusProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type FocusProviderProps = {
  children: React.ReactNode
}

export function FocusProvider({ children }: FocusProviderProps) {
  const [active, setActive] = useState<boolean>(() => getFocusMode())
  const { registerCommand } = useCommandPalette()

  const enable = useCallback(() => {
    setActive(true)
    setFocusMode(true)
  }, [])

  const disable = useCallback(() => {
    setActive(false)
    setFocusMode(false)
  }, [])

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev
      setFocusMode(next)
      return next
    })
  }, [])

  // Global keyboard shortcut: Cmd/Ctrl+Shift+.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const modKey = e.metaKey || e.ctrlKey
      if (modKey && e.shiftKey && e.key === '.') {
        e.preventDefault()
        toggle()
        return
      }

      if (active && e.key === 'Escape') {
        e.preventDefault()
        disable()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, disable, toggle])

  // Register "Toggle focus mode" command in the command palette
  useEffect(() => {
    registerCommand({
      id: 'view.focus-mode',
      label: 'Toggle focus mode',
      keywords: ['focus', 'fullscreen', 'full-bleed', 'hide sidebar', 'zen'],
      category: 'View',
      icon: 'Focus',
      run: toggle,
    })
  }, [registerCommand, toggle])

  const value = useMemo(
    () => ({ active, toggle, enable, disable }),
    [active, toggle, enable, disable],
  )

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}
