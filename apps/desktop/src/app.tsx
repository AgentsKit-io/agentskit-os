/**
 * AgentsKitOS Desktop — root application component.
 *
 * Wires sidebar navigation between Dashboard and Traces, the tray-driven
 * "Service mode active" banner, the global Cmd/Ctrl+K command palette
 * overlay (D-6), and the theme switcher with persisted choice (D-9 / D-4).
 */

import { useCallback, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Kbd, LiveRegion, SkipToContent, ThemeProvider, ThemeSwitcher, useTheme } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'
import { TracesScreen } from './screens/traces'
import { ExampleScreen } from './example-library/example-screen'
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
import { ShortcutProvider } from './keyboard/shortcut-provider'
import { ShortcutsPanel } from './keyboard/shortcuts-panel'
import { useShortcutHandler } from './keyboard/shortcut-handlers'
import { WorkspacesProvider } from './workspaces/workspaces-provider'
import { WorkspaceSwitcher } from './workspaces/workspace-switcher'
import { DashboardsProvider } from './dashboards/dashboards-provider'
import { PreferencesProvider } from './preferences/preferences-provider'
import { PreferencesPanel } from './preferences/preferences-panel'
import { StatusLineProvider } from './status-line/status-line-provider'
import { StatusLine } from './status-line/status-line'
import { StatusLineConfigPanel } from './status-line/status-line-config-panel'
import { ThemeEditorPanel } from './theme-editor/theme-editor-panel'
import { SnapshotPanel } from './snapshot/snapshot-panel'
import { NotificationPreferencesProvider } from './notifications/preferences/notification-preferences-provider'
import { NotificationPreferencesPanel } from './notifications/preferences/preferences-panel'
import { SearchProvider, useSearch } from './search/search-provider'
import { SearchOverlay } from './search/search-overlay'
import { AssistantProvider, useAssistant } from './assistant/assistant-provider'
import { AssistantOverlay } from './assistant/assistant-overlay'
import { ForkProvider } from './fork/fork-provider'
import { ArtifactViewerProvider, useArtifactViewer } from './artifacts/use-artifact-viewer'
import { ArtifactViewer } from './artifacts/artifact-viewer'

type ActiveScreen = 'dashboard' | 'traces' | 'examples'

const NAV_ITEMS: ReadonlyArray<{
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: string
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤' },
  { id: 'traces', label: 'Traces', icon: '◈' },
  { id: 'examples', label: 'Examples', icon: '✦' },
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
    <aside
      aria-label="Application sidebar"
      className="w-52 border-r border-[var(--ag-line)] bg-[var(--ag-surface-alt)]"
    >
      <WorkspaceSwitcher />
      <div className="flex items-center justify-between px-3 pt-3 text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        <span aria-hidden>Navigation</span>
        <span className="flex items-center gap-1 normal-case tracking-normal">
          <NotificationBell />
          <FocusToggle />
          <Kbd>⌘K</Kbd>
        </span>
      </div>
      <nav aria-label="Main navigation">
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
      </nav>
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
  announcement,
}: {
  activeScreen: ActiveScreen
  setActiveScreen: (screen: ActiveScreen) => void
  serviceBanner: boolean
  setServiceBanner: (visible: boolean) => void
  announcement: string
}) {
  const { active: focusActive } = useFocus()

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--ag-surface)]">
      {/* Global live region for screen-reader announcements */}
      <LiveRegion message={announcement} politeness="polite" />

      {!focusActive && (
        <header aria-label="Application header">
          <ServiceModeBanner
            visible={serviceBanner}
            onDismiss={() => setServiceBanner(false)}
          />
        </header>
      )}
      <div className="flex min-h-0 flex-1">
        {!focusActive && (
          <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />
        )}
        <main id="main-content" aria-label="Main content" className="flex flex-1 flex-col overflow-auto">
          {activeScreen === 'dashboard' && <Dashboard />}
          {activeScreen === 'traces' && <TracesScreen />}
          {activeScreen === 'examples' && <ExampleScreen />}
        </main>
      </div>
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
    const unlisten = listen<void>('tray://window-hidden', () => {
      setServiceBanner(true)
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined)
    }
  }, [])

  const handleNavigate = useCallback((screen: string) => {
    if (screen === 'dashboard' || screen === 'traces' || screen === 'examples') {
      setActiveScreen(screen as ActiveScreen)
      const labels: Record<ActiveScreen, string> = {
        dashboard: 'Navigated to Dashboard',
        traces: 'Navigated to Traces',
        examples: 'Navigated to Examples',
      }
      setAnnouncement(labels[screen as ActiveScreen])
    }
  }, [])

  const handleClearEventFeed = useCallback(() => {
    // No-op for now; Dashboard will register its own clear via the palette
    // command system in a follow-up.
  }, [])

  return (
    <ThemeProvider defaultTheme={initialTheme}>
      <ThemeSync />
      {/* Skip-to-content must be the very first focusable element */}
      <SkipToContent targetId="main-content" />
      <PreferencesProvider>
        <StatusLineProvider>
        <ShortcutProvider>
          <WorkspacesProvider>
            <DashboardsProvider>
            <NotificationPreferencesProvider>
              <NotificationsProvider>
                <OnboardingProvider>
                  <CommandPaletteProvider
                    onNavigate={handleNavigate}
                    onClearEventFeed={handleClearEventFeed}
                  >
                    <SearchProvider>
                      <FocusProvider>
                        <AssistantProvider>
                          <ForkProvider>
                          <ArtifactViewerProvider>
                          <NotificationCommandBridge onAnnounce={setAnnouncement} />
                          <ExamplesWirer onNavigate={handleNavigate} />
                          <ShortcutWirer />
                          <PreferencesWirer />
                          <ThemeEditorWirer />
                          <SnapshotWirer />
                          <NotificationPrefsWirer />
                          <SearchWirer />
                          <AssistantWirer />
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
                          <AssistantOverlay />
                          <ArtifactViewer />
                          <ArtifactViewerWirer />
                          <StatusLineConfigWirer />
                          </ArtifactViewerProvider>
                          </ForkProvider>
                        </AssistantProvider>
                      </FocusProvider>
                    </SearchProvider>
                  </CommandPaletteProvider>
                  <OnboardingTour />
                </OnboardingProvider>
              </NotificationsProvider>
            </NotificationPreferencesProvider>
            </DashboardsProvider>
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

/** Wires the "shortcuts.open" keyboard shortcut + palette command to render the panel. */
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

/** Wires the "theme-editor.open" palette command + modal render. */
function ThemeEditorWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'theme-editor.open',
      label: 'Open theme editor',
      keywords: ['theme', 'editor', 'colors', 'palette', 'customize', 'appearance'],
      category: 'System',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <ThemeEditorPanel isOpen={open} onClose={() => setOpen(false)} />
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

/** Wires snapshot export/import palette commands + modal. */
function SnapshotWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'snapshot.export',
      label: 'Export desktop snapshot',
      keywords: ['snapshot', 'export', 'backup'],
      category: 'System',
      run: () => setOpen(true),
    })
    registerCommand({
      id: 'snapshot.import',
      label: 'Import desktop snapshot',
      keywords: ['snapshot', 'import', 'restore'],
      category: 'System',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <SnapshotPanel isOpen={open} onClose={() => setOpen(false)} />
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

/** Registers the "examples.browse" palette command — navigates to the Examples screen. */
function ExamplesWirer({ onNavigate }: { onNavigate: (screen: string) => void }): null {
  const { registerCommand } = useCommandPalette()
  useEffect(() => {
    registerCommand({
      id: 'examples.browse',
      label: 'Browse examples',
      keywords: ['examples', 'library', 'templates', 'starter', 'browse', 'intent'],
      category: 'Navigation',
      run: () => onNavigate('examples'),
    })
  }, [registerCommand, onNavigate])
  return null
}

/** Registers the "assistant.toggle" palette command for the inline LLM assistant. */
function AssistantWirer(): null {
  const { registerCommand } = useCommandPalette()
  const { close, isOpen } = useAssistant()
  useEffect(() => {
    registerCommand({
      id: 'assistant.toggle',
      label: 'Toggle inline assistant',
      keywords: ['assistant', 'llm', 'ai', 'inline', 'prompt', 'suggest'],
      category: 'View',
      run: () => {
        if (isOpen) close()
        // Opening requires a target element — users open via Cmd+I on a
        // data-assist-target element; the palette command only closes.
      },
    })
  }, [registerCommand, isOpen, close])
  return null
}

/** Wires the "artifact-viewer.toggle" palette command. */
function ArtifactViewerWirer(): null {
  const { registerCommand } = useCommandPalette()
  const { close, current } = useArtifactViewer()
  useEffect(() => {
    registerCommand({
      id: 'artifact-viewer.toggle',
      label: 'Toggle artifact viewer',
      keywords: ['artifact', 'viewer', 'fullscreen'],
      category: 'View',
      run: () => {
        if (current) close()
      },
    })
  }, [registerCommand, current, close])
  return null
}
