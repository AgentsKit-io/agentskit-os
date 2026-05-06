/**
 * AgentsKitOS Desktop — root application component.
 *
 * M2 surface: Home (dashboard), Traces, Agents, Runs.
 * Top-level glue: ActiveScreen state, Tauri tray-banner subscription, and
 * composition of providers, shell, and command-palette wirers.
 *
 * Layout:
 *   app.tsx            — App() top-level state + composition
 *   app-providers.tsx  — provider tree
 *   app-shell.tsx      — sidebar, header, banner, screen surface
 *   app-wirers.tsx     — command-palette wirers
 *   app-nav.ts         — NAV_ITEMS, ActiveScreen type, helpers
 */

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@agentskit/os-ui'
import { CommandPalette } from './command-palette'
import { OnboardingTour } from './onboarding'
import { NotificationPanel } from './notifications/notification-panel'
import { SearchOverlay } from './search/search-overlay'
import { getTheme, setTheme } from './lib/theme-store'
import { AppProviders } from './app-providers'
import { AppShell } from './app-shell'
import {
  NavigationCommandWirer,
  NotificationCommandBridge,
  NotificationPrefsWirer,
  OnboardingCommandWirer,
  PreferencesWirer,
  SearchWirer,
  ShortcutWirer,
  StatusLineConfigWirer,
} from './app-wirers'
import type { ActiveScreen } from './app-nav'
import { isActiveScreen, labelForScreen, setScreenWithViewTransition } from './app-nav'

const hasTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Syncs theme changes to the persistent store. Must be inside ThemeProvider. */
function ThemeSync(): null {
  const { theme } = useTheme()
  useEffect(() => {
    setTheme(theme)
  }, [theme])
  return null
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

  const handleNavigate = useCallback(
    (screen: string) => {
      if (isActiveScreen(screen)) {
        if (screen !== activeScreen) {
          setScreenWithViewTransition(() => setActiveScreen(screen))
        }
        setAnnouncement(`Navigated to ${labelForScreen(screen)}`)
      }
    },
    [activeScreen],
  )

  const handleClearEventFeed = useCallback(() => {
    // Dashboard registers its own clear via the palette command system.
  }, [])

  return (
    <AppProviders
      defaultTheme={initialTheme}
      onPaletteNavigate={handleNavigate}
      onPaletteClearEventFeed={handleClearEventFeed}
    >
      <ThemeSync />
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
      <OnboardingTour />
    </AppProviders>
  )
}
