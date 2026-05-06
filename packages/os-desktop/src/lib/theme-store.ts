/**
 * theme-store — persist and retrieve the user's selected theme.
 *
 * Uses `localStorage` as the persistence layer (supported by both the Tauri
 * WebView runtime and plain browser environments for development/web build).
 *
 * API:
 *   getTheme()        → current persisted theme (or the default "dark")
 *   setTheme(theme)   → persist the selected theme
 */

import type { Theme } from '@agentskit/os-ui'

const STORAGE_KEY = 'agentskit:theme'
const DEFAULT_THEME: Theme = 'dark'

/** Valid theme values — used to guard against corrupted storage. */
const VALID_THEMES: ReadonlySet<string> = new Set<Theme>([
  'dark',
  'light',
  'cyber',
  'system',
])

function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.has(value)
}

/**
 * Read the persisted theme from localStorage.
 * Falls back to `"dark"` if no value is stored or the stored value is invalid.
 */
export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isValidTheme(stored)) return stored
  } catch {
    // localStorage may throw in certain secure contexts — use default.
  }
  return DEFAULT_THEME
}

/**
 * Persist the selected theme to localStorage.
 */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage write failure is non-fatal — theme still applies in memory.
  }
}
