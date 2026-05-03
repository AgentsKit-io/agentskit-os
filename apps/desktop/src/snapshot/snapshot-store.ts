/**
 * snapshot-store — pure functions for capturing and restoring desktop state.
 *
 * All functions are side-effect-free with respect to React state; they operate
 * exclusively on localStorage and fire DOM events so that React contexts that
 * listen to the "storage" event can re-hydrate.
 *
 * D-13 / Issue #47 — snapshot & restore desktop state.
 */

import {
  DesktopSnapshotSchema,
  SNAPSHOT_VERSION,
  migrateSnapshot,
  type DesktopSnapshot,
} from './snapshot-types'
import { SNAPSHOT_KEYS } from './snapshot-keys'

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

/**
 * Read every key listed in SNAPSHOT_KEYS from localStorage and bundle them
 * into a versioned DesktopSnapshot.
 *
 * Keys that are absent from localStorage are simply omitted from `state`.
 */
export function captureSnapshot(): DesktopSnapshot {
  const state: Record<string, unknown> = {}

  for (const key of SNAPSHOT_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        try {
          state[key] = JSON.parse(raw) as unknown
        } catch {
          // Value is not valid JSON — store as raw string.
          state[key] = raw
        }
      }
    } catch {
      // localStorage.getItem can throw in some secure contexts — skip key.
    }
  }

  return {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    state,
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Write each entry from `snap.state` back into localStorage (only for keys
 * listed in SNAPSHOT_KEYS) and dispatch a synthetic "storage" event so that
 * React contexts that listen to `window` storage events can re-hydrate.
 *
 * Keys present in SNAPSHOT_KEYS but absent from `snap.state` are left
 * untouched (no deletion), preserving existing values for those features.
 */
export function applySnapshot(snap: DesktopSnapshot): void {
  for (const key of SNAPSHOT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(snap.state, key)) continue
    const value = snap.state[key]
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Non-fatal — localStorage may be full or unavailable.
    }
  }

  // Notify all contexts that are subscribed to storage changes.
  try {
    window.dispatchEvent(new StorageEvent('storage'))
  } catch {
    // Non-fatal in environments without window.
  }
}

// ---------------------------------------------------------------------------
// JSON serialisation
// ---------------------------------------------------------------------------

/**
 * Serialise a DesktopSnapshot to a pretty-printed JSON string suitable for
 * writing to a file.
 */
export function exportSnapshotJson(snap: DesktopSnapshot): string {
  return JSON.stringify(snap, null, 2)
}

/**
 * Parse and validate a JSON string as a DesktopSnapshot.
 *
 * Runs Zod validation and applies any required version migrations.
 *
 * @throws {SyntaxError}  If the string is not valid JSON.
 * @throws {ZodError}     If the object does not match DesktopSnapshotSchema.
 * @throws {Error}        If the snapshot version is unrecognised.
 */
export function importSnapshotJson(text: string): DesktopSnapshot {
  const raw: unknown = JSON.parse(text)
  const parsed = DesktopSnapshotSchema.parse(raw)
  return migrateSnapshot(parsed, parsed.version)
}
