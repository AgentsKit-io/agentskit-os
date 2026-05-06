import type { ReactNode } from 'react'
import { ThemeProvider, SkipToContent } from '@agentskit/os-ui'
import type { Theme } from '@agentskit/os-ui'
import { CommandPaletteProvider } from './command-palette/command-palette-provider'
import { OnboardingProvider } from './onboarding/onboarding-provider'
import { FocusProvider } from './focus/focus-provider'
import { NotificationsProvider } from './notifications/notifications-provider'
import { ShortcutProvider } from './keyboard/shortcut-provider'
import { WorkspacesProvider } from './workspaces/workspaces-provider'
import { PreferencesProvider } from './preferences/preferences-provider'
import { StatusLineProvider } from './status-line/status-line-provider'
import { NotificationPreferencesProvider } from './notifications/preferences/notification-preferences-provider'
import { SearchProvider } from './search/search-provider'
import { SelectionProvider } from './lib/selection-store'

type AppProvidersProps = {
  readonly children: ReactNode
  readonly defaultTheme: Theme
  readonly onPaletteNavigate: (screen: string) => void
  readonly onPaletteClearEventFeed: () => void
}

/**
 * Wraps the application in its full provider tree. ThemeProvider is outermost
 * (so SkipToContent + ThemeSync can read theme tokens), then the remaining
 * providers in dependency order. CommandPaletteProvider sits inside SearchProvider
 * + FocusProvider so palette wirers can subscribe to both.
 */
export function AppProviders({
  children,
  defaultTheme,
  onPaletteNavigate,
  onPaletteClearEventFeed,
}: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
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
                        onNavigate={onPaletteNavigate}
                        onClearEventFeed={onPaletteClearEventFeed}
                      >
                        <SearchProvider>
                          <FocusProvider>{children}</FocusProvider>
                        </SearchProvider>
                      </CommandPaletteProvider>
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
