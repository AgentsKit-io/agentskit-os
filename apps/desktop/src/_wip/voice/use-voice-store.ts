/**
 * use-voice-store — persist and retrieve the user's voice-mode preference.
 *
 * Uses `localStorage` as the persistence layer.
 *
 * API:
 *   getVoiceEnabled()          → current persisted value (defaults to false)
 *   setVoiceEnabled(enabled)   → persist the preference
 */

const STORAGE_KEY = 'agentskitos.voice'

/**
 * Read the persisted voiceEnabled preference from localStorage.
 * Falls back to `false` if no value is stored or the stored value is invalid.
 */
export function getVoiceEnabled(): boolean {
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
 * Persist the voiceEnabled preference to localStorage.
 */
export function setVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // localStorage write failure is non-fatal — state still applies in memory.
  }
}
