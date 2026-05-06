/**
 * useWindowLayouts — get/set per-purpose window layouts in localStorage.
 *
 * Storage key: `agentskitos.windows`
 * Value:        JSON-serialised WindowLayoutMap (purpose → WindowLayout).
 */

import { useCallback, useState } from 'react'
import { WindowLayoutMapSchema, type WindowLayout, type WindowLayoutMap } from './types'

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'agentskitos.windows'

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

export function readLayouts(): WindowLayoutMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed = WindowLayoutMapSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function writeLayouts(layouts: WindowLayoutMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
  } catch {
    // localStorage may be unavailable — silently ignore.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseWindowLayoutsResult = {
  /** Retrieve the persisted layout for a given purpose (or undefined). */
  readonly getLayout: (purpose: string) => WindowLayout | undefined
  /** Persist a new layout for a purpose. */
  readonly setLayout: (purpose: string, layout: WindowLayout) => void
  /** Remove the persisted layout for a purpose. */
  readonly clearLayout: (purpose: string) => void
  /** All currently-stored layouts. */
  readonly layouts: WindowLayoutMap
}

export function useWindowLayouts(): UseWindowLayoutsResult {
  const [layouts, setLayouts] = useState<WindowLayoutMap>(() => readLayouts())

  const getLayout = useCallback(
    (purpose: string): WindowLayout | undefined => layouts[purpose],
    [layouts],
  )

  const setLayout = useCallback((purpose: string, layout: WindowLayout): void => {
    setLayouts((prev) => {
      const next = { ...prev, [purpose]: layout }
      writeLayouts(next)
      return next
    })
  }, [])

  const clearLayout = useCallback((purpose: string): void => {
    setLayouts((prev) => {
      const next = { ...prev }
      delete next[purpose]
      writeLayouts(next)
      return next
    })
  }, [])

  return { getLayout, setLayout, clearLayout, layouts }
}
