/**
 * Command palette — command type + built-in command registry.
 *
 * Built-in commands cover four categories:
 *   Navigation — switch active screen
 *   Runtime    — pause / resume agent runs
 *   View       — toggle theme
 *   System     — clear event feed
 */

export type CommandCategory = 'Navigation' | 'Runtime' | 'View' | 'System'

export type Command = {
  /** Unique stable identifier. */
  id: string
  /** Human-readable label shown in the palette. */
  label: string
  /** Extra terms used for fuzzy matching (not shown in UI). */
  keywords: string[]
  category: CommandCategory
  /** Optional lucide-react icon component name (string). Resolved by the list component. */
  icon?: string
  /** Called when the user activates the command (Enter / click). */
  run: () => void
}

// ---------------------------------------------------------------------------
// Built-in command factories — called at registration time so `run` closures
// can capture the live callbacks passed by the provider.
// ---------------------------------------------------------------------------

export type BuiltInDeps = {
  /** Navigate to the Dashboard screen. */
  goToDashboard: () => void
  /** Navigate to the Traces screen. */
  goToTraces: () => void
  /** Open the Settings panel (stub). */
  openSettings: () => void
  /** Pause all queued agent runs. */
  pauseRuns: () => void
  /** Resume paused agent runs. */
  resumeRuns: () => void
  /** Toggle between dark / light theme. */
  toggleTheme: () => void
  /** Clear the live event feed. */
  clearEventFeed: () => void
}

export function createBuiltInCommands(deps: BuiltInDeps): Command[] {
  return [
    // Navigation
    {
      id: 'nav.dashboard',
      label: 'Go to Dashboard',
      keywords: ['home', 'overview', 'main'],
      category: 'Navigation',
      icon: 'LayoutDashboard',
      run: deps.goToDashboard,
    },
    {
      id: 'nav.traces',
      label: 'Go to Traces',
      keywords: ['logs', 'spans', 'observability', 'history'],
      category: 'Navigation',
      icon: 'GitBranch',
      run: deps.goToTraces,
    },
    {
      id: 'nav.settings',
      label: 'Open Settings',
      keywords: ['preferences', 'config', 'options'],
      category: 'Navigation',
      icon: 'Settings',
      run: deps.openSettings,
    },

    // Runtime
    {
      id: 'runtime.pause',
      label: 'Pause Runs',
      keywords: ['stop', 'halt', 'freeze'],
      category: 'Runtime',
      icon: 'Pause',
      run: deps.pauseRuns,
    },
    {
      id: 'runtime.resume',
      label: 'Resume Runs',
      keywords: ['start', 'continue', 'unpause'],
      category: 'Runtime',
      icon: 'Play',
      run: deps.resumeRuns,
    },

    // View
    {
      id: 'view.toggle-theme',
      label: 'Toggle Theme',
      keywords: ['dark', 'light', 'mode', 'appearance', 'colour', 'color'],
      category: 'View',
      icon: 'Sun',
      run: deps.toggleTheme,
    },

    // System
    {
      id: 'system.clear-feed',
      label: 'Clear Event Feed',
      keywords: ['flush', 'reset', 'wipe', 'events', 'log'],
      category: 'System',
      icon: 'Trash2',
      run: deps.clearEventFeed,
    },
  ]
}
