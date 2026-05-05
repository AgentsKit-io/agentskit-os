/**
 * useMonitors — React hook that calls the Rust `list_monitors` command.
 *
 * When the app is not running inside a Tauri runtime (e.g. browser dev or
 * jsdom tests) the invoke call rejects; in that case a single-monitor mock
 * array is returned so the UI still renders correctly.
 */

import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { MonitorInfoSchema, type MonitorInfo } from './types'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Fixture data used outside Tauri runtime
// ---------------------------------------------------------------------------

const MONITOR_FIXTURE: MonitorInfo = {
  id: '0',
  name: 'Display 1 (mock)',
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  scaleFactor: 1,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseMonitorsResult = {
  /** List of connected monitors.  Empty only while loading. */
  readonly monitors: ReadonlyArray<MonitorInfo>
  /** True while the invoke is in flight. */
  readonly loading: boolean
  /** Non-null if the invoke failed (only happens outside Tauri runtime). */
  readonly error: string | null
}

export function useMonitors(): UseMonitorsResult {
  const [monitors, setMonitors] = useState<ReadonlyArray<MonitorInfo>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    invoke<unknown>('list_monitors')
      .then((raw) => {
        if (cancelled) return
        const parsed = z.array(MonitorInfoSchema).safeParse(raw)
        if (parsed.success) {
          setMonitors(parsed.data)
        } else {
          // Malformed response — fall back to mock.
          setMonitors([MONITOR_FIXTURE])
          setError('Unexpected response from list_monitors')
        }
      })
      .catch(() => {
        if (cancelled) return
        // Not running in Tauri — use mock so the UI is still usable.
        setMonitors([MONITOR_FIXTURE])
        setError(null) // Suppress error in non-Tauri environments.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { monitors, loading, error }
}
