import { useEffect, useState } from 'react'
import { useCommandPalette } from './command-palette/command-palette-provider'
import { useOnboarding } from './onboarding/onboarding-provider'
import { useNotifications } from './notifications/notifications-provider'
import { useShortcutHandler } from './keyboard/shortcut-handlers'
import { useSearch } from './search/search-provider'
import { ShortcutsPanel } from './keyboard/shortcuts-panel'
import { PreferencesPanel } from './preferences/preferences-panel'
import { StatusLineConfigPanel } from './status-line/status-line-config-panel'
import { NotificationPreferencesPanel } from './notifications/preferences/preferences-panel'
import { NAV_ITEMS } from './app-nav'

/** Wires the "preferences.open" palette command + modal render. */
export function PreferencesWirer(): React.JSX.Element | null {
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
export function OnboardingCommandWirer({
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
export function NavigationCommandWirer({
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
export function ShortcutWirer(): React.JSX.Element | null {
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
export function StatusLineConfigWirer(): React.JSX.Element | null {
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
export function NotificationCommandBridge({
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
export function NotificationPrefsWirer(): React.JSX.Element | null {
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
export function SearchWirer(): null {
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
