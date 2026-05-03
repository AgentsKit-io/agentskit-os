/**
 * use-status-line-store — localStorage helper for the status line config.
 *
 * Persists the ordered list of visible segment ids under
 * `agentskitos.status-line`.
 *
 * Validation: the parsed value must be a non-empty array of strings.
 * Falls back to `defaultIds` on any parse/schema failure.
 */

import { z } from 'zod'
import { DEFAULT_VISIBLE_IDS } from './status-segments'

const STORAGE_KEY = 'agentskitos.status-line'

const StoredSchema = z.array(z.string()).min(0)

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

export function loadStatusLineConfig(defaultIds: readonly string[] = DEFAULT_VISIBLE_IDS): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...defaultIds]
    const parsed = StoredSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return [...defaultIds]
    // Only keep ids that appear in the default set (removes stale ids after
    // a segment is removed, and adds newly-added ones at the end).
    const valid = parsed.data.filter((id) => defaultIds.includes(id))
    // Append any ids in defaultIds that are not yet in the persisted list.
    for (const id of defaultIds) {
      if (!valid.includes(id)) valid.push(id)
    }
    return valid
  } catch {
    return [...defaultIds]
  }
}

export function saveStatusLineConfig(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Non-fatal — localStorage may be unavailable (e.g. private mode quota).
  }
}

export function clearStatusLineConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal.
  }
}
