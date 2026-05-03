/**
 * AgentsKitOS Desktop — root application component.
 *
 * Wires the dashboard plus a tray-driven "Service mode active" banner that
 * appears whenever the Rust side hides the main window via the close-button
 * handler.
 */

import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { ThemeProvider } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'

function ServiceModeBanner({
  visible,
  onDismiss,
}: {
  visible: boolean
  onDismiss: () => void
}) {
  if (!visible) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-1.5 text-[13px] text-[var(--ag-ink)]"
    >
      <span>Service mode active — the sidecar continues running in the background.</span>
      <button
        aria-label="Dismiss service mode banner"
        onClick={onDismiss}
        className="px-1 text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)]"
      >
        ×
      </button>
    </div>
  )
}

export function App() {
  const [serviceBanner, setServiceBanner] = useState(false)

  useEffect(() => {
    const unlisten = listen<void>('tray://window-hidden', () => {
      setServiceBanner(true)
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined)
    }
  }, [])

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="flex h-full min-h-screen flex-col bg-[var(--ag-surface)]">
        <ServiceModeBanner
          visible={serviceBanner}
          onDismiss={() => setServiceBanner(false)}
        />
        <main className="flex flex-1 flex-col overflow-auto">
          <Dashboard />
        </main>
      </div>
    </ThemeProvider>
  )
}
