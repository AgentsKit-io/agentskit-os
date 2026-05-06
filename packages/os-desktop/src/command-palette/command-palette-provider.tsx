/**
 * CommandPaletteProvider — global command palette context.
 *
 * Exposes `useCommandPalette()` returning `{ open, openPalette, closePalette, registerCommand }`.
 * Listens for Cmd+K / Ctrl+K globally and toggles the palette.
 * Auto-registers built-in commands on mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from '@agentskit/os-ui'
import { pauseRuns, resumeRuns } from '../lib/sidecar'
import { createBuiltInCommands, type Command } from './commands'
import { getBuiltIn } from '../keyboard/shortcut-registry'
import { matchesBinding } from '../keyboard/shortcut-types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type CommandPaletteContextValue = {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  registerCommand: (command: Command) => void
  commands: Command[]
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined)

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type CommandPaletteProviderProps = {
  children: React.ReactNode
  /**
   * Callback for navigation commands. The provider itself does not know about
   * the screen state — it delegates to the parent.
   */
  onNavigate?: (screen: string) => void
  /** Callback to clear the event feed. */
  onClearEventFeed?: () => void
}

export function CommandPaletteProvider({
  children,
  onNavigate,
  onClearEventFeed,
}: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false)
  const [extraCommands, setExtraCommands] = useState<Command[]>([])

  const { theme, setTheme } = useTheme()
  const themeRef = useRef(theme)
  themeRef.current = theme

  // Stable callbacks
  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  const registerCommand = useCallback((command: Command) => {
    setExtraCommands((prev) => {
      // De-duplicate by id
      const filtered = prev.filter((c) => c.id !== command.id)
      return [...filtered, command]
    })
  }, [])

  // Build built-in commands. Recreated when deps change.
  const builtInCommands = useMemo(
    () =>
      createBuiltInCommands({
        goToDashboard: () => {
          onNavigate?.('dashboard')
          setOpen(false)
        },
        goToTraces: () => {
          onNavigate?.('traces')
          setOpen(false)
        },
        openSettings: () => {
          onNavigate?.('settings')
          setOpen(false)
        },
        pauseRuns: () => {
          void pauseRuns()
          setOpen(false)
        },
        resumeRuns: () => {
          void resumeRuns()
          setOpen(false)
        },
        toggleTheme: () => {
          const next = themeRef.current === 'dark' ? 'light' : 'dark'
          setTheme(next)
          setOpen(false)
        },
        clearEventFeed: () => {
          onClearEventFeed?.()
          setOpen(false)
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onNavigate, onClearEventFeed, setTheme],
  )

  const commands = useMemo(
    () => [...builtInCommands, ...extraCommands],
    [builtInCommands, extraCommands],
  )

  // Global keyboard shortcut: read binding from the shortcut registry so the
  // registry is the single source of truth for the palette toggle key.
  // We also accept the ctrl-equivalent for cross-platform support (Windows/Linux).
  useEffect(() => {
    const paletteShortcut = getBuiltIn('palette.toggle')
    const binding = paletteShortcut?.defaultBinding ?? 'meta+k'
    // Derive a ctrl-variant: substitute 'meta' with 'ctrl' so the palette
    // opens on Ctrl+K for Windows / Linux users.
    const ctrlVariant = binding.replace(/\bmeta\b/, 'ctrl')

    function handleKeyDown(e: KeyboardEvent) {
      if (matchesBinding(e, binding) || matchesBinding(e, ctrlVariant)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo(
    () => ({ open, openPalette, closePalette, registerCommand, commands }),
    [open, openPalette, closePalette, registerCommand, commands],
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  )
}
