import { useCallback } from 'react'
import { Kbd, LiveRegion, ThemeSwitcher } from '@agentskit/os-ui'
import { Search, X } from 'lucide-react'
import { AgentsScreen } from './screens/agents'
import { Dashboard } from './screens/dashboard'
import { RunsScreen } from './screens/runs'
import { TracesScreen } from './screens/traces'
import { useCommandPalette } from './command-palette/command-palette-provider'
import { useFocus } from './focus/focus-provider'
import { FocusToggle } from './focus/focus-toggle'
import { NotificationBell } from './notifications/notification-bell'
import { WorkspaceSwitcher } from './workspaces/workspace-switcher'
import { StatusLine } from './status-line/status-line'
import type { ActiveScreen, NavItem } from './app-nav'
import { NAV_ITEMS, setScreenWithViewTransition } from './app-nav'

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
  readonly onNavigate?: (screen: 'runs') => void
}) {
  if (screen === 'dashboard') {
    return onNavigate ? <Dashboard onNavigate={onNavigate} /> : <Dashboard />
  }
  return SCREEN_RENDERERS[screen]()
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

export function AppShell({
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

  const navigateRuns = useCallback(() => {
    navigateWithTransition('runs')
  }, [navigateWithTransition])

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
            <ScreenSurface screen={activeScreen} onNavigate={navigateRuns} />
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
