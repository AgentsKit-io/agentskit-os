/**
 * WindowRouter — reads the `?screen=` query parameter and renders the
 * appropriate screen full-bleed, or falls back to rendering `children`
 * (the main shell) when `screen` is absent.
 *
 * Used in main.tsx so secondary windows opened via `open_window` show the
 * correct content without a full navigation stack.
 *
 * Supported screen values:
 *   "dashboard"    — renders <Dashboard />
 *   "traces"       — renders <TracesScreen />
 *   "trace-detail" — renders <TracesScreen /> (detail view; trace id TBD)
 */

import { useMemo } from 'react'
import { Dashboard } from '../screens/dashboard'
import { TracesScreen } from '../screens/traces'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScreenParam(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('screen')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type WindowRouterProps = {
  /** Rendered when no `?screen=` param is present (the main window). */
  readonly children: React.ReactNode
}

export function WindowRouter({ children }: WindowRouterProps): React.JSX.Element {
  const screen = useMemo(() => getScreenParam(), [])

  if (screen === 'dashboard') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--ag-surface)]">
        <Dashboard />
      </div>
    )
  }

  if (screen === 'traces' || screen === 'trace-detail') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--ag-surface)]">
        <TracesScreen />
      </div>
    )
  }

  // No screen param — render the main shell as passed.
  return <>{children}</>
}
