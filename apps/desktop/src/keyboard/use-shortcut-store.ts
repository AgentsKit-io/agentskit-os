/**
 * Persist and restore user shortcut overrides from localStorage.
 * Key: `agentskitos.shortcuts`
 *
 * Overrides are stored as a plain JSON object: `{ [id]: binding }`.
 * Import / export helpers emit / accept the same schema wrapped in a
 * `{ version: 1, overrides: … }` envelope for forward compatibility.
 */

import type { Binding } from './shortcut-types'

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'agentskitos.shortcuts' as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShortcutOverrides = Record<string, Binding>

type ExportEnvelope = {
  version: 1
  overrides: ShortcutOverrides
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

/** Load persisted overrides, returning an empty object on failure. */
export function loadOverrides(): ShortcutOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    // Validate every value is a string
    const result: ShortcutOverrides = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') {
        result[k] = v
      }
    }
    return result
  } catch {
    return {}
  }
}

/** Persist overrides to localStorage. */
export function saveOverrides(overrides: ShortcutOverrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

/** Remove all persisted overrides. */
export function clearOverrides(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/**
 * Serialise current overrides to a JSON string for download.
 * Returns the JSON string (caller responsible for triggering the download).
 */
export function exportOverridesToJson(overrides: ShortcutOverrides): string {
  const envelope: ExportEnvelope = { version: 1, overrides }
  return JSON.stringify(envelope, null, 2)
}

/**
 * Trigger a browser file download of the current overrides.
 */
export function downloadOverrides(overrides: ShortcutOverrides): void {
  const json = exportOverridesToJson(overrides)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agentskitos-shortcuts.json'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse an imported JSON string into `ShortcutOverrides`.
 *
 * Accepts both the full envelope (`{ version, overrides }`) and a bare
 * `{ [id]: binding }` object for convenience.
 *
 * @throws {Error} if the JSON is invalid or structurally unsupported.
 */
export function importOverridesFromJson(json: string): ShortcutOverrides {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object')
  }

  const obj = parsed as Record<string, unknown>

  // Detect envelope format
  if ('version' in obj && obj['version'] === 1 && 'overrides' in obj) {
    const inner = obj['overrides']
    if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
      throw new Error('Invalid overrides payload')
    }
    return extractStringMap(inner as Record<string, unknown>)
  }

  // Bare format
  return extractStringMap(obj)
}

function extractStringMap(obj: Record<string, unknown>): ShortcutOverrides {
  const result: ShortcutOverrides = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      result[k] = v
    }
  }
  return result
}
