/**
 * use-focus-store — persist and retrieve the focus-mode active state.
 *
 * Uses `localStorage` as the persistence layer.
 *
 * API:
 *   getFocusMode()        → current persisted value (defaults to false)
 *   setFocusMode(active)  → persist the active state
 */

const STORAGE_KEY = 'agentskitos.focus-mode'

/**
 * Read the persisted focus-mode state from localStorage.
 * Falls back to `false` if no value is stored or the stored value is invalid.
 */
export function getFocusMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // localStorage may throw in certain secure contexts — use default.
  }
  return false
}

/**
 * Persist the focus-mode active state to localStorage.
 */
export function setFocusMode(active: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(active))
  } catch {
    // localStorage write failure is non-fatal — state still applies in memory.
  }
}
