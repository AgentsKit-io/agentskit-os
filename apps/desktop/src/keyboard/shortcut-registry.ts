/**
 * Built-in shortcut registry — pure data, no React.
 *
 * 12 shortcuts covering the most-used actions in AgentsKitOS Desktop.
 * The command palette ⌘K binding lives here so it is the single
 * source of truth; the CommandPaletteProvider reads it at runtime.
 */

import type { Shortcut } from './shortcut-types'

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const BUILT_IN_SHORTCUTS: ReadonlyArray<Shortcut> = [
  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: 'palette.toggle',
    label: 'Toggle Command Palette',
    defaultBinding: 'meta+k',
    description: 'Open or close the command palette.',
    category: 'Navigation',
  },
  {
    id: 'nav.dashboard',
    label: 'Go to Dashboard',
    defaultBinding: 'meta+1',
    description: 'Switch to the Dashboard screen.',
    category: 'Navigation',
  },
  {
    id: 'nav.traces',
    label: 'Go to Traces',
    defaultBinding: 'meta+2',
    description: 'Switch to the Traces screen.',
    category: 'Navigation',
  },
  {
    id: 'shortcuts.open',
    label: 'Open Keyboard Shortcuts',
    defaultBinding: 'meta+shift+/',
    description: 'Open the keyboard shortcuts settings panel.',
    category: 'Navigation',
  },

  // ── View ──────────────────────────────────────────────────────────────────
  {
    id: 'view.focus-mode',
    label: 'Toggle Focus Mode',
    defaultBinding: 'meta+shift+f',
    description: 'Hide the sidebar for a distraction-free view.',
    category: 'View',
  },
  {
    id: 'view.toggle-theme',
    label: 'Toggle Theme',
    defaultBinding: 'meta+shift+t',
    description: 'Switch between dark and light themes.',
    category: 'View',
  },
  {
    id: 'view.notifications',
    label: 'Toggle Notifications',
    defaultBinding: 'meta+shift+n',
    description: 'Show or hide the notification centre.',
    category: 'View',
  },

  // ── Runtime ───────────────────────────────────────────────────────────────
  {
    id: 'runtime.pause',
    label: 'Pause Runs',
    defaultBinding: 'meta+shift+p',
    description: 'Pause all queued agent runs.',
    category: 'Runtime',
  },
  {
    id: 'runtime.resume',
    label: 'Resume Runs',
    defaultBinding: 'meta+shift+r',
    description: 'Resume paused agent runs.',
    category: 'Runtime',
  },

  // ── System ────────────────────────────────────────────────────────────────
  {
    id: 'system.clear-feed',
    label: 'Clear Event Feed',
    defaultBinding: 'meta+shift+delete',
    description: 'Clear the live event feed.',
    category: 'System',
  },
  {
    id: 'system.refresh',
    label: 'Refresh Data',
    defaultBinding: 'meta+r',
    description: 'Reload the current screen data.',
    category: 'System',
  },

  // ── Help ──────────────────────────────────────────────────────────────────
  {
    id: 'help.open',
    label: 'Open Help',
    defaultBinding: 'meta+shift+h',
    description: 'Open the help documentation.',
    category: 'Help',
  },
] as const

/** Look up a built-in shortcut definition by id. */
export function getBuiltIn(id: string): Shortcut | undefined {
  return BUILT_IN_SHORTCUTS.find((s) => s.id === id)
}

/** All unique categories present in the registry, preserving insertion order. */
export function getCategories(): ReadonlyArray<string> {
  const seen = new Set<string>()
  const result: string[] = []
  for (const s of BUILT_IN_SHORTCUTS) {
    if (!seen.has(s.category)) {
      seen.add(s.category)
      result.push(s.category)
    }
  }
  return result
}
