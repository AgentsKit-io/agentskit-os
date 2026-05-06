/**
 * AgentsKitOS Desktop — root application component.
 *
 * M2 surface: Home (dashboard), Traces, Agents, Runs.
 * Wires sidebar nav, tray-driven service-mode banner, command palette,
 * notifications, focus mode, status line, and the global theme switcher.
 */

import { useCallback, useEffect, useState } from 'react'
import { Kbd, LiveRegion, SkipToContent, ThemeProvider, ThemeSwitcher, useTheme } from '@agentskit/os-ui'
import { Activity, Bot, GitBranch, Home, Search, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AgentsScreen } from './screens/agents'
import { Dashboard } from './screens/dashboard'
import { RunsScreen } from './screens/runs'
import { TracesScreen } from './screens/traces'
import { CommandPaletteProvider, useCommandPalette } from './command-palette/command-palette-provider'
import { CommandPalette } from './command-palette'
import { OnboardingProvider, useOnboarding } from './onboarding/onboarding-provider'
import { OnboardingTour } from './onboarding'
import { getTheme, setTheme } from './lib/theme-store'
import { FocusProvider, useFocus } from './focus/focus-provider'
import { FocusToggle } from './focus/focus-toggle'
import { NotificationsProvider, useNotifications } from './notifications/notifications-provider'
import { NotificationBell } from './notifications/notification-bell'
import { NotificationPanel } from './notifications/notification-panel'
import { ShortcutProvider } from './keyboard/shortcut-provider'
import { ShortcutsPanel } from './keyboard/shortcuts-panel'
import { useShortcutHandler } from './keyboard/shortcut-handlers'
import { WorkspacesProvider } from './workspaces/workspaces-provider'
import { WorkspaceSwitcher } from './workspaces/workspace-switcher'
import { PreferencesProvider } from './preferences/preferences-provider'
import { PreferencesPanel } from './preferences/preferences-panel'
import { StatusLineProvider } from './status-line/status-line-provider'
import { StatusLine } from './status-line/status-line'
import { StatusLineConfigPanel } from './status-line/status-line-config-panel'
import { NotificationPreferencesProvider } from './notifications/preferences/notification-preferences-provider'
import { NotificationPreferencesPanel } from './notifications/preferences/preferences-panel'
import { SearchProvider, useSearch } from './search/search-provider'
import { SearchOverlay } from './search/search-overlay'
import { SelectionProvider } from './lib/selection-store'

const hasTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function setScreenWithViewTransition(update: () => void): void {
  const viewTransitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => void
  }

  if (
    viewTransitionDocument.startViewTransition &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  ) {
    try {
      viewTransitionDocument.startViewTransition(() => {
        update()
      })
    } catch {
      update()
    }
    return
  }

  update()
}

type ActiveScreen = 'dashboard' | 'traces' | 'agents' | 'runs'

type NavItem = {
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: LucideIcon
  readonly keywords?: readonly string[]
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, keywords: ['dashboard', 'overview'] },
  { id: 'agents', label: 'Agents', icon: Bot, keywords: ['workers', 'providers'] },
  { id: 'runs', label: 'Runs', icon: Activity, keywords: ['runs', 'executions', 'history'] },
  { id: 'traces', label: 'Traces', icon: GitBranch, keywords: ['spans', 'observability'] },
] as const

function isActiveScreen(screen: string): screen is ActiveScreen {
  return NAV_ITEMS.some((item) => item.id === screen)
}

function labelForScreen(screen: ActiveScreen): string {
  return NAV_ITEMS.find((item) => item.id === screen)?.label ?? screen
}

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
      <span>Service mode active - the sidecar continues running in the background.</span>
      <button
        type="button"
        aria-label="Dismiss service mode banner"
        onClick={onDismiss}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  )
}

const SIDEBAR_CLASSNAME =
  'flex max-h-[46vh] w-full shrink-0 flex-col overflow-y-auto border-b border-[var(--ag-line)] bg-[var(--ag-surface-alt)]/95 supports-[backdrop-filter]:backdrop-blur-xl md:max-h-none md:w-64 md:border-b-0 md:border-r'

function Sidebar({
  activeScreen,
  onNavigate,
}: {
  readonly activeScreen: ActiveScreen
  readonly onNavigate: (screen: ActiveScreen) => void
}) {
  return (
    <aside
      aria-label="Application sidebar"
      data-onboarding-target="sidebar"
      className={SIDEBAR_CLASSNAME}
    >
      <WorkspaceSwitcher />
      <div className="flex items-center justify-between gap-3 px-3 pt-3 text-[11px] uppercase text-[var(--ag-ink-subtle)]">
        <span aria-hidden className="tracking-[0.16em]">AgentsKitOS</span>
        <span
          className="flex shrink-0 items-center gap-1 normal-case tracking-normal"
          data-onboarding-target="command-palette"
        >
          <NotificationBell />
          <FocusToggle />
          <CommandPaletteButton />
        </span>
      </div>
      <nav aria-label="Main navigation">
        <div className="flex flex-col gap-1 px-3 pt-3">
          {NAV_ITEMS.map((item) => (
            <SidebarNavButton
              key={item.id}
              item={item}
              active={activeScreen === item.id}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
      <div className="mt-auto border-t border-[var(--ag-line)] px-3 py-3">
        <div className="mb-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]/70 p-3">
          <div className="flex items-start gap-2">
            <Search aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ag-accent)]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--ag-ink)]">Everything else lives in search.</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ag-ink-muted)]">
                Press <Kbd>⌘K</Kbd> to jump anywhere.
              </p>
            </div>
          </div>
        </div>
        <ThemeSwitcher />
      </div>
    </aside>
  )
}

function CommandPaletteButton() {
  const { open, openPalette, closePalette } = useCommandPalette()
  const shortcutLabel =
    typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
      ? '⌘K'
      : 'Ctrl K'

  return (
    <button
      type="button"
      aria-label="Toggle command palette"
      aria-pressed={open}
      onClick={() => {
        if (open) closePalette()
        else openPalette()
      }}
      className="rounded text-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ag-accent)]"
    >
      <Kbd>{shortcutLabel}</Kbd>
    </button>
  )
}

function SidebarNavButton({
  item,
  active,
  onNavigate,
}: {
  readonly item: NavItem
  readonly active: boolean
  readonly onNavigate: (screen: ActiveScreen) => void
}) {
  return (
    <button
      type="button"
      data-testid={`nav-${item.id}`}
      data-onboarding-target={`nav-${item.id}`}
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ag-accent)]',
        active
          ? 'bg-[var(--ag-accent)]/15 font-medium text-[var(--ag-accent)]'
          : 'text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
      ].join(' ')}
    >
      <item.icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </button>
  )
}

const SCREEN_RENDERERS: Record<ActiveScreen, () => React.ReactNode> = {
  dashboard: () => <Dashboard />,
  traces: () => <TracesScreen />,
  agents: () => <AgentsScreen />,
  runs: () => <RunsScreen />,
}

function ScreenSurface({
  screen,
  onNavigate,
}: {
  readonly screen: ActiveScreen
  readonly onNavigate?: (screen: ActiveScreen) => void
}) {
  if (screen === 'dashboard') {
    return onNavigate ? <Dashboard onNavigate={onNavigate} /> : <Dashboard />
  }
  return SCREEN_RENDERERS[screen]()
}

function AppShell({
  activeScreen,
  setActiveScreen,
  serviceBanner,
  setServiceBanner,
  announcement,
}: {
  activeScreen: ActiveScreen
  setActiveScreen: (screen: ActiveScreen) => void
  serviceBanner: boolean
  setServiceBanner: (visible: boolean) => void
  announcement: string
}) {
  const { active: focusActive, disable: disableFocus } = useFocus()

  const navigateWithTransition = useCallback(
    (screen: ActiveScreen) => {
      if (screen === activeScreen) return
      setScreenWithViewTransition(() => setActiveScreen(screen))
    },
    [activeScreen, setActiveScreen],
  )

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--ag-surface)]">
      <LiveRegion message={announcement} politeness="polite" />

      {!focusActive && (
        <header aria-label="Application header">
          <ServiceModeBanner
            visible={serviceBanner}
            onDismiss={() => setServiceBanner(false)}
          />
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {!focusActive && (
          <Sidebar activeScreen={activeScreen} onNavigate={navigateWithTransition} />
        )}
        <main
          id="main-content"
          aria-label="Main content"
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
        >
          <div key={activeScreen} className="app-screen flex min-h-0 flex-1 flex-col overflow-auto">
            <ScreenSurface screen={activeScreen} onNavigate={navigateWithTransition} />
          </div>
        </main>
      </div>
      {focusActive && (
        <button
          type="button"
          className={[
            'fixed right-4 top-4 z-[60] rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5',
            'text-sm font-medium text-[var(--ag-ink)] shadow-2xl',
            'hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]',
          ].join(' ')}
          onClick={disableFocus}
        >
          Exit focus mode
        </button>
      )}
      <StatusLine />
    </div>
  )
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard')
  const [serviceBanner, setServiceBanner] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const initialTheme = getTheme()

  useEffect(() => {
    if (!hasTauriRuntime()) return undefined

    let disposed = false
    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<void>('tray://window-hidden', () => {
          setServiceBanner(true)
        }),
      )
      .then((fn) => {
        if (disposed) {
          fn()
          return
        }
        unlisten = fn
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  const handleNavigate = useCallback((screen: string) => {
    if (isActiveScreen(screen)) {
      if (screen !== activeScreen) {
        setScreenWithViewTransition(() => setActiveScreen(screen))
      }
      setAnnouncement(`Navigated to ${labelForScreen(screen)}`)
    }
  }, [activeScreen])

  const handleClearEventFeed = useCallback(() => {
    // Dashboard registers its own clear via the palette command system.
  }, [])

  return (
    <ThemeProvider defaultTheme={initialTheme}>
      <ThemeSync />
      <SkipToContent targetId="main-content" />
      <PreferencesProvider>
        <StatusLineProvider>
          <ShortcutProvider>
            <WorkspacesProvider>
              <NotificationPreferencesProvider>
                <NotificationsProvider>
                  <SelectionProvider>
                    <OnboardingProvider>
                      <CommandPaletteProvider
                        onNavigate={handleNavigate}
                        onClearEventFeed={handleClearEventFeed}
                      >
                        <SearchProvider>
                          <FocusProvider>
                            <NotificationCommandBridge onAnnounce={setAnnouncement} />
                            <OnboardingCommandWirer onAnnounce={setAnnouncement} />
                            <NavigationCommandWirer onNavigate={handleNavigate} />
                            <ShortcutWirer />
                            <PreferencesWirer />
                            <NotificationPrefsWirer />
                            <SearchWirer />
                            <StatusLineConfigWirer />
                            <AppShell
                              activeScreen={activeScreen}
                              setActiveScreen={setActiveScreen}
                              serviceBanner={serviceBanner}
                              setServiceBanner={setServiceBanner}
                              announcement={announcement}
                            />
                            <CommandPalette />
                            <NotificationPanel />
                            <SearchOverlay />
                          </FocusProvider>
                        </SearchProvider>
                      </CommandPaletteProvider>
                      <OnboardingTour />
                    </OnboardingProvider>
                  </SelectionProvider>
                </NotificationsProvider>
              </NotificationPreferencesProvider>
            </WorkspacesProvider>
          </ShortcutProvider>
        </StatusLineProvider>
      </PreferencesProvider>
    </ThemeProvider>
  )
}

/** Wires the "preferences.open" palette command + modal render. */
function PreferencesWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'preferences.open',
      label: 'Open preferences',
      keywords: ['preferences', 'settings', 'config'],
      category: 'System',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <PreferencesPanel isOpen={open} onClose={() => setOpen(false)} />
}

/** Registers a command to re-run the first-use product tour. */
function OnboardingCommandWirer({
  onAnnounce,
}: {
  onAnnounce: (msg: string) => void
}): null {
  const { registerCommand, closePalette } = useCommandPalette()
  const { restart } = useOnboarding()

  useEffect(() => {
    registerCommand({
      id: 'onboarding.restart',
      label: 'Restart onboarding tour',
      keywords: ['onboarding', 'tour', 'guide', 'intro', 'help'],
      category: 'System',
      run: () => {
        closePalette()
        restart()
        onAnnounce('Onboarding tour restarted')
      },
    })
  }, [registerCommand, closePalette, restart, onAnnounce])

  return null
}

/** Registers keyboard-first navigation commands for every M2 surface. */
function NavigationCommandWirer({
  onNavigate,
}: {
  onNavigate: (screen: string) => void
}): null {
  const { registerCommand, closePalette } = useCommandPalette()

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      registerCommand({
        id: `nav.surface.${item.id}`,
        label: `Go to ${item.label}`,
        keywords: [item.id, item.label.toLowerCase(), ...(item.keywords ?? [])],
        category: 'Navigation',
        run: () => {
          onNavigate(item.id)
          closePalette()
        },
      })
    }
  }, [registerCommand, closePalette, onNavigate])

  return null
}

/** Wires the "shortcuts.open" keyboard shortcut + palette command. */
function ShortcutWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useShortcutHandler('shortcuts.open', () => setOpen(true))
  useEffect(() => {
    registerCommand({
      id: 'shortcuts.open',
      label: 'Open keyboard shortcuts',
      keywords: ['shortcuts', 'keyboard', 'bindings', 'hotkeys'],
      category: 'System',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  if (!open) return null
  return <ShortcutsPanel onClose={() => setOpen(false)} />
}

/** Wires the "status-line.configure" palette command + modal render. */
function StatusLineConfigWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'status-line.configure',
      label: 'Configure status line',
      keywords: ['status', 'statusbar', 'statusline', 'segments', 'bottom bar'],
      category: 'View',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <StatusLineConfigPanel isOpen={open} onClose={() => setOpen(false)} />
}

/** Registers palette commands that interact with the notification center. */
function NotificationCommandBridge({
  onAnnounce,
}: {
  onAnnounce: (msg: string) => void
}): null {
  const { registerCommand } = useCommandPalette()
  const { open, close, isOpen, clear } = useNotifications()
  useEffect(() => {
    registerCommand({
      id: 'notifications.toggle',
      label: 'Toggle notifications',
      keywords: ['notifications', 'alerts', 'bell'],
      category: 'View',
      run: () => {
        if (isOpen) {
          close()
          onAnnounce('Notifications panel closed')
        } else {
          open()
          onAnnounce('Notifications panel opened')
        }
      },
    })
    registerCommand({
      id: 'notifications.clear',
      label: 'Clear notifications',
      keywords: ['notifications', 'clear', 'reset'],
      category: 'View',
      run: () => {
        clear()
        onAnnounce('Notifications cleared')
      },
    })
  }, [registerCommand, open, close, isOpen, clear, onAnnounce])
  return null
}

/** Wires the "notifications.configure" palette command + modal render. */
function NotificationPrefsWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'notifications.configure',
      label: 'Configure notifications',
      keywords: ['notifications', 'preferences', 'routing', 'quiet', 'hours'],
      category: 'System',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <NotificationPreferencesPanel isOpen={open} onClose={() => setOpen(false)} />
}

/** Registers the "search.open" palette command for the global fuzzy search. */
function SearchWirer(): null {
  const { registerCommand } = useCommandPalette()
  const { open } = useSearch()
  useEffect(() => {
    registerCommand({
      id: 'search.open',
      label: 'Search everything',
      keywords: ['search', 'find', 'everything', 'fuzzy'],
      category: 'Navigation',
      run: () => open(),
    })
  }, [registerCommand, open])
  return null
}
