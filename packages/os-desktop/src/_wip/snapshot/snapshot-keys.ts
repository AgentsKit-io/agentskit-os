/**
 * snapshot-keys — exhaustive list of localStorage keys owned by the desktop.
 *
 * Every key listed here will be included in a captured snapshot and
 * re-written when a snapshot is applied.  Keys are grouped by feature for
 * documentation purposes; the ordering does not affect runtime behaviour.
 *
 * D-13 / Issue #47 — snapshot & restore desktop state.
 */

// ---------------------------------------------------------------------------
// Key catalogue
// ---------------------------------------------------------------------------

const PREFERENCE_KEYS = [
  'agentskitos.preferences',
] as const

const SHORTCUT_KEYS = [
  'agentskitos.shortcuts',
] as const

const THEME_KEYS = [
  // Active theme selection (dark | light | cyber | system)
  'agentskit:theme',
  // Custom theme definitions authored in the theme editor
  'agentskitos.custom-themes',
] as const

const STATUS_LINE_KEYS = [
  'agentskitos.status-line',
] as const

const NOTIFICATION_KEYS = [
  'agentskitos.notifications',
] as const

const FOCUS_KEYS = [
  'agentskitos.focus-mode',
] as const

const ONBOARDING_KEYS = [
  'agentskitos.onboarding',
] as const

const WORKSPACE_KEYS = [
  'agentskitos.current-workspace',
] as const

// ---------------------------------------------------------------------------
// Consolidated export
// ---------------------------------------------------------------------------

/**
 * All localStorage keys that belong to the desktop.
 * Used by `captureSnapshot` and `applySnapshot` to determine which keys
 * to read from / write to localStorage.
 */
export const SNAPSHOT_KEYS: readonly string[] = [
  ...PREFERENCE_KEYS,
  ...SHORTCUT_KEYS,
  ...THEME_KEYS,
  ...STATUS_LINE_KEYS,
  ...NOTIFICATION_KEYS,
  ...FOCUS_KEYS,
  ...ONBOARDING_KEYS,
  ...WORKSPACE_KEYS,
] as const
