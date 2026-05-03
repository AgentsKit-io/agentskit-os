/**
 * AgentsKitOS Desktop — root application component.
 *
 * Wires sidebar navigation between Dashboard and Traces, the tray-driven
 * "Service mode active" banner, the global Cmd/Ctrl+K command palette
 * overlay (D-6), and the theme switcher with persisted choice (D-9 / D-4).
 */

import { useCallback, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Kbd, ThemeProvider, ThemeSwitcher, useTheme } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'
import { TracesScreen } from './screens/traces'
import { CommandPaletteProvider } from './command-palette/command-palette-provider'
import { CommandPalette } from './command-palette'
import { OnboardingProvider } from './onboarding/onboarding-provider'
import { OnboardingTour } from './onboarding'
import { getTheme, setTheme } from './lib/theme-store'
import { FocusProvider, useFocus } from './focus/focus-provider'
import { FocusToggle } from './focus/focus-toggle'
import {
  NotificationsProvider,
  useNotifications,
} from './notifications/notifications-provider'
import { NotificationBell } from './notifications/notification-bell'
import { NotificationPanel } from './notifications/notification-panel'
import { useCommandPalette } from './command-palette/command-palette-provider'

type ActiveScreen = 'dashboard' | 'traces'

const NAV_ITEMS: ReadonlyArray<{
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: string
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤' },
  { id: 'traces', label: 'Traces', icon: '◈' },
]

/** Syncs theme changes to the persistent store. Must be inside ThemeProvider. */
function ThemeSync(): null {
  const { theme } = useTheme()
  useEffect(() => {
    setTheme(theme)
  }, [theme])
  return null
}

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
      <div className="flex items-center justify-between px-3 pt-3 text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        <span>Navigation</span>
        <span className="flex items-center gap-1 normal-case tracking-normal">
          <NotificationBell />
          <FocusToggle />
          <Kbd>⌘K</Kbd>
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3 pt-2">
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
      <div className="mt-4 border-t border-[var(--ag-line)] px-3 pt-3">
        <ThemeSwitcher />
      </div>
    </aside>
  )
}

/** Inner shell that reads focus state and conditionally hides sidebar/banner. */
function AppShell({
  activeScreen,
  setActiveScreen,
  serviceBanner,
  setServiceBanner,
}: {
  activeScreen: ActiveScreen
  setActiveScreen: (screen: ActiveScreen) => void
  serviceBanner: boolean
  setServiceBanner: (visible: boolean) => void
}) {
  const { active: focusActive } = useFocus()

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--ag-surface)]">
      {!focusActive && (
        <ServiceModeBanner
          visible={serviceBanner}
          onDismiss={() => setServiceBanner(false)}
        />
      )}
      <div className="flex min-h-0 flex-1">
        {!focusActive && (
          <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />
        )}
        <main className="flex flex-1 flex-col overflow-auto">
          {activeScreen === 'dashboard' && <Dashboard />}
          {activeScreen === 'traces' && <TracesScreen />}
        </main>
      </div>
    </div>
  )
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard')
  const [serviceBanner, setServiceBanner] = useState(false)
  const initialTheme = getTheme()

  useEffect(() => {
    const unlisten = listen<void>('tray://window-hidden', () => {
      setServiceBanner(true)
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined)
    }
  }, [])

  const handleNavigate = useCallback((screen: string) => {
    if (screen === 'dashboard' || screen === 'traces') {
      setActiveScreen(screen)
    }
  }, [])

  const handleClearEventFeed = useCallback(() => {
    // No-op for now; Dashboard will register its own clear via the palette
    // command system in a follow-up.
  }, [])

  return (
    <ThemeProvider defaultTheme={initialTheme}>
      <ThemeSync />
      <NotificationsProvider>
        <OnboardingProvider>
          <CommandPaletteProvider
            onNavigate={handleNavigate}
            onClearEventFeed={handleClearEventFeed}
          >
            <FocusProvider>
              <NotificationCommandBridge />
              <AppShell
                activeScreen={activeScreen}
                setActiveScreen={setActiveScreen}
                serviceBanner={serviceBanner}
                setServiceBanner={setServiceBanner}
              />
              <CommandPalette />
              <NotificationPanel />
            </FocusProvider>
          </CommandPaletteProvider>
          <OnboardingTour />
        </OnboardingProvider>
      </NotificationsProvider>
    </ThemeProvider>
  )
}

/** Registers palette commands that interact with the notification center. */
function NotificationCommandBridge(): null {
  const { registerCommand } = useCommandPalette()
  const { open, close, isOpen, clear } = useNotifications()
  useEffect(() => {
    registerCommand({
      id: 'notifications.toggle',
      label: 'Toggle notifications',
      keywords: ['notifications', 'alerts', 'bell'],
      category: 'View',
      run: () => (isOpen ? close() : open()),
    })
    registerCommand({
      id: 'notifications.clear',
      label: 'Clear notifications',
      keywords: ['notifications', 'clear', 'reset'],
      category: 'View',
      run: () => clear(),
    })
  }, [registerCommand, open, close, isOpen, clear])
  return null
}
