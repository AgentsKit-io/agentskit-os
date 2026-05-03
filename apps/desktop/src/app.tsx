/**
 * Top-level application shell.
 *
 * Three regions:
 *   1. Title bar  — Tauri-decorated window chrome (drag region)
 *   2. Sidebar    — workspace switcher placeholder
 *   3. Main pane  — active screen content
 */

import { useEffect, useState } from 'react'
import { pingSidecar } from './lib/sidecar'
import { LoadingScreen } from './screens/loading'
import { DashboardScreen } from './screens/dashboard'

type AppStatus = 'loading' | 'ready' | 'error'

export const App = (): React.JSX.Element => {
  const [status, setStatus] = useState<AppStatus>('loading')

  useEffect(() => {
    let cancelled = false

    const checkSidecar = async (): Promise<void> => {
      // Poll until sidecar is alive (up to ~10 s).
      let attempts = 0
      const maxAttempts = 20
      const delay = (ms: number): Promise<void> =>
        new Promise((r) => setTimeout(r, ms))

      while (attempts < maxAttempts) {
        const alive = await pingSidecar()
        if (cancelled) return
        if (alive) {
          setStatus('ready')
          return
        }
        attempts++
        await delay(500)
      }

      if (!cancelled) setStatus('error')
    }

    void checkSidecar()

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading' || status === 'error') {
    return <LoadingScreen />
  }

  return (
    <div className="app-shell dark">
      {/* Title bar — data-tauri-drag-region marks it as draggable */}
      <TitleBar />

      {/* Body row */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="main-pane">
          <DashboardScreen />
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shell primitives
// ---------------------------------------------------------------------------

const TitleBar = (): React.JSX.Element => (
  <header
    data-tauri-drag-region
    className="flex items-center h-10 px-4 bg-panel border-b border-line shrink-0 select-none"
  >
    {/* macOS traffic-light buttons sit in the left inset — leave room */}
    <span className="ml-16 text-xs font-medium text-ink-subtle tracking-wide">
      AgentsKitOS
    </span>
  </header>
)

const Sidebar = (): React.JSX.Element => (
  <aside className="sidebar">
    <div className="flex flex-col gap-1 p-3">
      <p className="px-2 py-1 text-xs font-medium text-ink-subtle uppercase tracking-widest">
        Workspaces
      </p>
      {/* TODO(#44): replace with real workspace switcher */}
      <button
        type="button"
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-muted hover:bg-panel-alt hover:text-ink transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-accent/40 shrink-0" />
        <span className="truncate">Default workspace</span>
      </button>
    </div>
  </aside>
)
