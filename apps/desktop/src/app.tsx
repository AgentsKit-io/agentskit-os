/**
 * AgentsKitOS Desktop — root application component.
 *
 * Wires sidebar navigation between Dashboard and Traces, plus a tray-driven
 * "Service mode active" banner that appears whenever the Rust side hides the
 * main window via the close-button handler.
 */

import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { ThemeProvider } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'
import { TracesScreen } from './screens/traces'

type ActiveScreen = 'dashboard' | 'traces'

const NAV_ITEMS: ReadonlyArray<{
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: string
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤' },
  { id: 'traces', label: 'Traces', icon: '◈' },
]

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

type SidebarProps = {
  readonly activeScreen: ActiveScreen
  readonly onNavigate: (screen: ActiveScreen) => void
}

function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside className="w-52 border-r border-[var(--ag-line)] bg-[var(--ag-surface-alt)]">
      <div className="flex flex-col gap-1 px-3 pt-3">
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`nav-${item.id}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activeScreen === item.id ? 'page' : undefined}
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              activeScreen === item.id
                ? 'bg-[var(--ag-accent)]/15 font-medium text-[var(--ag-accent)]'
                : 'text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
            ].join(' ')}
          >
            <span aria-hidden className="h-4 w-4 shrink-0 text-center text-[12px]">
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard')
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
        <div className="flex min-h-0 flex-1">
          <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <main className="flex flex-1 flex-col overflow-auto">
            {activeScreen === 'dashboard' && <Dashboard />}
            {activeScreen === 'traces' && <TracesScreen />}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
