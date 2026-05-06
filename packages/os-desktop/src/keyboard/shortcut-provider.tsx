/**
 * ShortcutProvider — global keyboard shortcut context.
 *
 * Merges built-in shortcuts with persisted user overrides, dispatches
 * keydown events to registered handlers, and exposes:
 *
 *   useShortcuts() → { all, get, override, reset, resetAll, conflicts }
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
import { BUILT_IN_SHORTCUTS } from './shortcut-registry'
import { matchesBinding, type Binding, type Shortcut } from './shortcut-types'
import { loadOverrides, saveOverrides, type ShortcutOverrides } from './use-shortcut-store'

// ---------------------------------------------------------------------------
// Handler registry (module-level, stable across renders)
// ---------------------------------------------------------------------------

type HandlerFn = (event: KeyboardEvent) => void
const handlers = new Map<string, HandlerFn>()

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export type ShortcutContextValue = {
  /** All shortcuts with their effective (potentially overridden) bindings. */
  all: ReadonlyArray<Shortcut>
  /** Get a single shortcut's effective binding by id. */
  get: (id: string) => Shortcut | undefined
  /**
   * Override the binding for a shortcut.
   * Persists to localStorage immediately.
   */
  override: (id: string, binding: Binding) => void
  /**
   * Reset a single shortcut back to its default binding.
   * Removes the stored override.
   */
  reset: (id: string) => void
  /** Reset all overrides. */
  resetAll: () => void
  /**
   * Returns pairs of shortcut ids that share the same effective binding.
   * Empty array means no conflicts.
   */
  conflicts: ReadonlyArray<readonly [string, string]>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined)

export function useShortcuts(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext)
  if (!ctx) {
    throw new Error('useShortcuts must be used within a ShortcutProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Internal: register handler (used by useShortcutHandler)
// ---------------------------------------------------------------------------

export function _registerHandler(id: string, fn: HandlerFn): () => void {
  handlers.set(id, fn)
  return () => {
    handlers.delete(id)
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ShortcutProviderProps = {
  children: React.ReactNode
}

export function ShortcutProvider({ children }: ShortcutProviderProps) {
  const [overrides, setOverrides] = useState<ShortcutOverrides>(() => loadOverrides())

  // Merge built-ins with overrides
  const all = useMemo<ReadonlyArray<Shortcut>>(
    () =>
      BUILT_IN_SHORTCUTS.map((s) => {
        const ob = overrides[s.id]
        return ob !== undefined ? { ...s, defaultBinding: ob } : s
      }),
    [overrides],
  )

  // Effective binding map: id → binding (for fast lookup in keydown handler)
  const bindingMap = useMemo<ReadonlyMap<string, Binding>>(() => {
    const map = new Map<string, Binding>()
    for (const s of all) {
      map.set(s.id, s.defaultBinding)
    }
    return map
  }, [all])

  // Keep ref so the keydown handler sees fresh data without re-registering
  const bindingMapRef = useRef(bindingMap)
  bindingMapRef.current = bindingMap

  // Detect conflicts: bindings shared by more than one id
  const conflicts = useMemo<ReadonlyArray<readonly [string, string]>>(() => {
    const pairs: Array<readonly [string, string]> = []
    const entries = [...bindingMap.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const ei = entries[i]
        const ej = entries[j]
        if (ei && ej && ei[1] === ej[1]) {
          pairs.push([ei[0], ej[0]] as const)
        }
      }
    }
    return pairs
  }, [bindingMap])

  // Global keydown listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const [id, binding] of bindingMapRef.current) {
        if (matchesBinding(event, binding)) {
          const handler = handlers.get(id)
          if (handler) {
            event.preventDefault()
            handler(event)
            return
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Public API
  const get = useCallback(
    (id: string): Shortcut | undefined => all.find((s) => s.id === id),
    [all],
  )

  const override = useCallback((id: string, binding: Binding) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: binding }
      saveOverrides(next)
      return next
    })
  }, [])

  const reset = useCallback((id: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[id]
      saveOverrides(next)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setOverrides({})
    saveOverrides({})
  }, [])

  const value = useMemo<ShortcutContextValue>(
    () => ({ all, get, override, reset, resetAll, conflicts }),
    [all, get, override, reset, resetAll, conflicts],
  )

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>
}
