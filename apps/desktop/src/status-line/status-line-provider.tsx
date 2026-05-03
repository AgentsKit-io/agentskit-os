/**
 * StatusLineProvider — context for the customisable bottom status bar.
 *
 * Exposes `useStatusLineConfig()` returning:
 *   visibleIds — ordered array of segment ids currently shown
 *   setVisible  — toggle a segment on/off
 *   reorder     — replace the full ordered list
 *   reset       — restore default segment order/visibility
 *
 * Config is persisted under `agentskitos.status-line` via the store helper.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { loadStatusLineConfig, saveStatusLineConfig, clearStatusLineConfig } from './use-status-line-store'
import { DEFAULT_VISIBLE_IDS } from './status-segments'

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export type StatusLineConfigContextValue = {
  /** Ordered array of segment ids that are currently visible. */
  readonly visibleIds: string[]
  /**
   * Toggle a segment on or off.
   * `id`      — the segment id to toggle
   * `visible` — true = show, false = hide
   */
  readonly setVisible: (id: string, visible: boolean) => void
  /** Replace the full ordered list (used by drag-and-drop / up-down buttons). */
  readonly reorder: (ids: string[]) => void
  /** Restore default segment order and visibility. */
  readonly reset: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StatusLineConfigContext = createContext<StatusLineConfigContextValue | undefined>(
  undefined,
)

export function useStatusLineConfig(): StatusLineConfigContextValue {
  const ctx = useContext(StatusLineConfigContext)
  if (!ctx) {
    throw new Error('useStatusLineConfig must be used within a StatusLineProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type StatusLineProviderProps = {
  children: React.ReactNode
  /** Override initial ids — useful in tests. */
  initialIds?: string[]
}

export function StatusLineProvider({ children, initialIds }: StatusLineProviderProps) {
  const [visibleIds, setVisibleIds] = useState<string[]>(
    () => initialIds ?? loadStatusLineConfig(),
  )

  const persist = useCallback((ids: string[]) => {
    setVisibleIds(ids)
    saveStatusLineConfig(ids)
  }, [])

  const setVisible = useCallback(
    (id: string, visible: boolean) => {
      setVisibleIds((prev) => {
        let next: string[]
        if (visible && !prev.includes(id)) {
          // Append at the end of the visible list
          next = [...prev, id]
        } else if (!visible && prev.includes(id)) {
          next = prev.filter((v) => v !== id)
        } else {
          return prev
        }
        saveStatusLineConfig(next)
        return next
      })
    },
    [],
  )

  const reorder = useCallback(
    (ids: string[]) => {
      persist(ids)
    },
    [persist],
  )

  const reset = useCallback(() => {
    clearStatusLineConfig()
    setVisibleIds([...DEFAULT_VISIBLE_IDS])
  }, [])

  const value: StatusLineConfigContextValue = useMemo(
    () => ({ visibleIds, setVisible, reorder, reset }),
    [visibleIds, setVisible, reorder, reset],
  )

  return (
    <StatusLineConfigContext.Provider value={value}>
      {children}
    </StatusLineConfigContext.Provider>
  )
}
