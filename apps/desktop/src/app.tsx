/**
 * AgentsKitOS Desktop — root application component.
 *
 * Wires sidebar navigation between Dashboard and Traces, the tray-driven
 * "Service mode active" banner, the global Cmd/Ctrl+K command palette
 * overlay (D-6), and the theme switcher with persisted choice (D-9 / D-4).
 */

import { useCallback, useEffect, useState } from 'react'
import { Kbd, LiveRegion, SkipToContent, ThemeProvider, ThemeSwitcher, useTheme } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'
import { RunsScreen } from './screens/runs'
import { TracesScreen } from './screens/traces'
import { ExampleScreen } from './example-library/example-screen'
import { CommandPaletteProvider } from './command-palette/command-palette-provider'
import { CommandPalette } from './command-palette'
import { OnboardingProvider, useOnboarding } from './onboarding/onboarding-provider'
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
import { MultiMonitorPanel } from './multi-monitor/multi-monitor-panel'
import { CustomWidgetEditor } from './dashboards/custom/custom-widget-editor'
import { MarketplacePanel } from './dashboards/marketplace/marketplace-panel'
import { useDashboards } from './dashboards/dashboards-provider'
import { VoiceProvider, useVoice } from './voice/voice-provider'
import { VoiceToggle } from './voice/voice-toggle'
import { VoiceOverlay } from './voice/voice-overlay'
import { PluginContributionsProvider } from './plugins/plugin-contributions-provider'

const hasTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

type ActiveScreen =
  | 'dashboard'
  | 'flows'
  | 'runs'
  | 'traces'
  | 'agents'
  | 'hitl'
  | 'triggers'
  | 'evals'
  | 'benchmark'
  | 'cost'
  | 'security'
  | 'examples'

type NavItem = {
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: string
  readonly status: 'supported' | 'preview'
  readonly description?: string
}

const NAV_GROUPS: ReadonlyArray<{
  readonly label: string
  readonly items: readonly NavItem[]
}> = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '▤', status: 'supported' },
      {
        id: 'flows',
        label: 'Flows',
        icon: '◇',
        status: 'preview',
        description: 'Visual flow editing is planned from ADR-0019 and will land behind typed graph contracts.',
      },
      {
        id: 'runs',
        label: 'Runs',
        icon: '◷',
        status: 'supported',
      },
      { id: 'traces', label: 'Traces', icon: '◈', status: 'supported' },
    ],
  },
  {
    label: 'Orchestration',
    items: [
      {
        id: 'agents',
        label: 'Agents',
        icon: '◎',
        status: 'preview',
        description: 'Agent registry, ownership, versions, and governance need a production provider before promotion.',
      },
      {
        id: 'hitl',
        label: 'HITL Inbox',
        icon: '◉',
        status: 'preview',
        description: 'Human approval queues require action contracts, audit events, and permission states.',
      },
      {
        id: 'triggers',
        label: 'Triggers',
        icon: '▶',
        status: 'preview',
        description: 'Slack, Discord, Teams, cron, PR, and webhook triggers need typed trigger contracts.',
      },
    ],
  },
  {
    label: 'Quality',
    items: [
      {
        id: 'evals',
        label: 'Evals',
        icon: '✓',
        status: 'preview',
        description: 'Evaluation suites will surface dataset, scorer, and run-result contracts.',
      },
      {
        id: 'benchmark',
        label: 'Benchmark',
        icon: '✦',
        status: 'preview',
        description: 'Benchmark arena will compare models/agents on completeness, cost, duration, and regressions.',
      },
    ],
  },
  {
    label: 'Control',
    items: [
      {
        id: 'cost',
        label: 'Cost & Quotas',
        icon: '$',
        status: 'preview',
        description: 'Cost controls need quota, budget, token, and chargeback data sources.',
      },
      {
        id: 'security',
        label: 'Security',
        icon: '◇',
        status: 'preview',
        description: 'Security center will join policy, audit, vault, and compliance workflows once contracts settle.',
      },
    ],
  },
]

const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { id: 'examples', label: 'Examples', icon: '✦', status: 'supported' },
]

const NAV_ITEMS = [...NAV_GROUPS.flatMap((group) => group.items), ...SECONDARY_NAV_ITEMS] as const

const PREVIEW_NAV_COMMAND_ITEMS = NAV_GROUPS
  .flatMap((group) => group.items)
  .filter((item) => item.status === 'preview')

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
      data-onboarding-target="sidebar"
      className="flex w-60 flex-col border-r border-[var(--ag-line)] bg-[var(--ag-surface-alt)]"
    >
      <WorkspaceSwitcher />
      <div className="flex items-center justify-between px-3 pt-3 text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        <span aria-hidden>Navigation</span>
        <span
          className="flex items-center gap-1 normal-case tracking-normal"
          data-onboarding-target="command-palette"
        >
          <NotificationBell />
          <VoiceToggle />
          <FocusToggle />
          <Kbd>⌘K</Kbd>
        </span>
      </div>
      <nav aria-label="Main navigation">
        <div className="flex flex-col gap-3 px-3 pt-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <div className="px-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                {group.label}
              </div>
              {group.items.map((item) => (
                <SidebarNavButton
                  key={item.id}
                  item={item}
                  active={activeScreen === item.id}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>
      <div className="mt-auto border-t border-[var(--ag-line)] px-3 py-3">
        <div className="mb-3 flex flex-col gap-1">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SidebarNavButton
              key={item.id}
              item={item}
              active={activeScreen === item.id}
              onNavigate={onNavigate}
            />
          ))}
        </div>
        <ThemeSwitcher />
      </div>
    </aside>
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
      <span aria-hidden className="h-4 w-4 shrink-0 text-center text-[12px]">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status === 'preview' && (
        <span className="rounded-full border border-[var(--ag-line)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--ag-ink-subtle)]">
          Preview
        </span>
      )}
    </button>
  )
}

function PreviewSurface({ screen }: { readonly screen: ActiveScreen }) {
  const item = NAV_ITEMS.find((navItem) => navItem.id === screen)
  const title = `${item?.label ?? 'Surface'} Is In Preview`
  return (
    <section
      aria-labelledby="preview-surface-title"
      className="flex min-h-full flex-1 items-center justify-center bg-[var(--ag-surface)] p-8"
    >
      <div className="max-w-xl rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 shadow-sm">
        <div className="mb-3 inline-flex rounded-full border border-[var(--ag-line)] px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--ag-ink-subtle)]">
          Preview
        </div>
        <h1 id="preview-surface-title" className="text-xl font-semibold text-[var(--ag-ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ag-ink-muted)]">
          {item?.description ??
            'This area is part of the AgentsKitOS roadmap. It will become available when its data contract and backend workflow are ready.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel-alt)] px-3 py-1.5 text-sm font-medium text-[var(--ag-ink)] hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]"
            onClick={() => window.open('https://github.com/orgs/AgentsKit-io/projects/2/views/1', '_blank', 'noopener,noreferrer')}
          >
            View Roadmap
          </button>
          <span className="inline-flex items-center rounded-md border border-[var(--ag-line)] px-3 py-1.5 text-sm text-[var(--ag-ink-muted)]">
            Open the command palette with <span className="ml-1"><Kbd>⌘K</Kbd></span>
          </span>
        </div>
      </div>
    </section>
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
          {activeScreen === 'runs' && <RunsScreen />}
          {activeScreen === 'traces' && <TracesScreen />}
          {activeScreen === 'examples' && <ExampleScreen />}
          {activeScreen !== 'dashboard' && activeScreen !== 'runs' && activeScreen !== 'traces' && activeScreen !== 'examples' && (
            <PreviewSurface screen={activeScreen} />
          )}
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
      setActiveScreen(screen)
      setAnnouncement(`Navigated to ${labelForScreen(screen)}`)
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
      <VoiceProvider>
      <PreferencesProvider>
        <StatusLineProvider>
        <ShortcutProvider>
          <WorkspacesProvider>
            <DashboardsProvider>
            <PluginContributionsProvider>
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
                          <OnboardingCommandWirer onAnnounce={setAnnouncement} />
                          <PreviewNavigationCommandWirer onNavigate={handleNavigate} />
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
                          <MultiMonitorWirer />
                          <VoiceWirer />
                          <CustomWidgetWirer />
                          <MarketplaceWirer />
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
            </PluginContributionsProvider>
            </DashboardsProvider>
          </WorkspacesProvider>
        </ShortcutProvider>
        </StatusLineProvider>
      </PreferencesProvider>
      <VoiceOverlay />
      </VoiceProvider>
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

/** Registers keyboard-first navigation commands for preview roadmap surfaces. */
function PreviewNavigationCommandWirer({
  onNavigate,
}: {
  onNavigate: (screen: string) => void
}): null {
  const { registerCommand, closePalette } = useCommandPalette()

  useEffect(() => {
    for (const item of PREVIEW_NAV_COMMAND_ITEMS) {
      registerCommand({
        id: `nav.${item.id}`,
        label: `Go to ${item.label}`,
        keywords: [item.id, item.label.toLowerCase(), 'preview', 'roadmap'],
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

/** Wires the multi-monitor palette commands + modal. */
function MultiMonitorWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'multi-monitor.open-dashboard',
      label: 'Open dashboard on monitor…',
      keywords: ['monitor', 'multi', 'window', 'screen', 'dashboard'],
      category: 'View',
      run: () => setOpen(true),
    })
    registerCommand({
      id: 'multi-monitor.open-traces',
      label: 'Open traces on monitor…',
      keywords: ['monitor', 'multi', 'window', 'screen', 'traces'],
      category: 'View',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return <MultiMonitorPanel isOpen={open} onClose={() => setOpen(false)} />
}

/** Wires "New custom widget" palette command + editor modal. */
function CustomWidgetWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'custom-widget.new',
      label: 'New custom widget',
      keywords: ['custom', 'widget', 'metric', 'dashboard'],
      category: 'View',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return (
    <CustomWidgetEditor
      isOpen={open}
      onClose={() => setOpen(false)}
      onSaved={() => setOpen(false)}
    />
  )
}

/** Wires "Browse dashboard templates" palette command + marketplace modal. */
function MarketplaceWirer(): React.JSX.Element | null {
  const { registerCommand } = useCommandPalette()
  const { create } = useDashboards()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    registerCommand({
      id: 'dashboard-marketplace.open',
      label: 'Browse dashboard templates',
      keywords: ['dashboard', 'marketplace', 'template', 'gallery'],
      category: 'View',
      run: () => setOpen(true),
    })
  }, [registerCommand])
  return (
    <MarketplacePanel
      isOpen={open}
      onClose={() => setOpen(false)}
      onApply={(t) => {
        const name = 'layout' in t ? t.layout.name : t.name
        create(name)
        setOpen(false)
      }}
    />
  )
}

/** Wires the voice.toggle palette command. */
function VoiceWirer(): null {
  const { registerCommand } = useCommandPalette()
  const { toggle } = useVoice()
  useEffect(() => {
    registerCommand({
      id: 'voice.toggle',
      label: 'Toggle voice mode',
      keywords: ['voice', 'mic', 'speech', 'dictate'],
      category: 'View',
      run: () => toggle(),
    })
  }, [registerCommand, toggle])
  return null
}
