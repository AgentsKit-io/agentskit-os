/**
 * snapshot-types — Zod schema for the desktop state snapshot bundle.
 *
 * A DesktopSnapshot is a versioned, self-contained JSON document that captures
 * every localStorage-persisted desktop key at a point in time. It can be
 * exported to disk and later re-applied to restore the full desktop state.
 *
 * D-13 / Issue #47 — snapshot & restore desktop state.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const DesktopSnapshotSchema = z.object({
  /** Schema version — increment when breaking changes are made to the format. */
  version: z.number().int().positive(),
  /** ISO-8601 timestamp of when the snapshot was created. */
  createdAt: z.string(),
  /**
   * Map of localStorage key → JSON-decoded value.
   * Only keys listed in SNAPSHOT_KEYS are included.
   */
  state: z.record(z.string(), z.unknown()),
})

export type DesktopSnapshot = z.infer<typeof DesktopSnapshotSchema>

// ---------------------------------------------------------------------------
// Current version constant
// ---------------------------------------------------------------------------

export const SNAPSHOT_VERSION = 1

// ---------------------------------------------------------------------------
// Migration stub
// ---------------------------------------------------------------------------

/**
 * Migrate a snapshot from a previous version to the current version.
 *
 * This is a stub: only version 1 exists so no migration is required yet.
 * Future versions should add `case` branches to upgrade incrementally.
 *
 * @param snap        The raw (already Zod-validated) snapshot.
 * @param fromVersion The version number found in the snapshot file.
 * @returns           A snapshot at the current SNAPSHOT_VERSION.
 * @throws            If the version is unrecognised.
 */
export function migrateSnapshot(
  snap: DesktopSnapshot,
  fromVersion: number,
): DesktopSnapshot {
  if (fromVersion === SNAPSHOT_VERSION) {
    return snap
  }
  throw new Error(
    `Unsupported snapshot version ${fromVersion}. Expected ${SNAPSHOT_VERSION}.`,
  )
}
