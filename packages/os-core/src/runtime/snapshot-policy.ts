// Per #245 — snapshot scheduling + retention policy.
// Pure: schema for the policy + a retention pruner that picks which
// snapshots to keep / delete given a clock and a list of recorded snapshots.

import { z } from 'zod'

export const SnapshotCadence = z.enum(['hourly', 'daily', 'weekly', 'monthly'])
export type SnapshotCadence = z.infer<typeof SnapshotCadence>

export const SnapshotRetentionPolicy = z.object({
  schemaVersion: z.literal(1).default(1),
  cadence: SnapshotCadence,
  /** Keep at most this many snapshots. */
  keepLast: z.number().int().min(1).max(10_000),
  /** Discard snapshots older than this many days. */
  maxAgeDays: z.number().int().min(1).max(3_650),
  /** Optional cron-like start window the runtime feeds the scheduler. */
  startsAt: z.string().min(1).max(64).optional(),
})
export type SnapshotRetentionPolicy = z.infer<typeof SnapshotRetentionPolicy>

export type SnapshotRecord = {
  readonly id: string
  readonly takenAt: number
  readonly bytes: number
}

export type RetentionPlan = {
  readonly keep: readonly SnapshotRecord[]
  readonly delete: readonly SnapshotRecord[]
  readonly reason: readonly { readonly id: string; readonly cause: 'older_than_max_age' | 'beyond_keep_last' }[]
}

const DAY_MS = 24 * 60 * 60_000

/**
 * Compute the retention plan for a list of snapshots (#245). Pure: caller
 * passes the clock + records (newest-first or any order). Snapshots older
 * than `maxAgeDays` are deleted; remaining are sorted newest-first and the
 * oldest beyond `keepLast` are deleted too.
 */
export const planSnapshotRetention = (
  records: readonly SnapshotRecord[],
  policy: SnapshotRetentionPolicy,
  opts: { readonly clock?: () => number } = {},
): RetentionPlan => {
  const now = (opts.clock ?? Date.now)()
  const cutoff = now - policy.maxAgeDays * DAY_MS

  const keep: SnapshotRecord[] = []
  const remove: SnapshotRecord[] = []
  const reason: { id: string; cause: 'older_than_max_age' | 'beyond_keep_last' }[] = []

  for (const rec of records) {
    if (rec.takenAt < cutoff) {
      remove.push(rec)
      reason.push({ id: rec.id, cause: 'older_than_max_age' })
    } else {
      keep.push(rec)
    }
  }

  keep.sort((a, b) => b.takenAt - a.takenAt)
  if (keep.length > policy.keepLast) {
    const trimmed = keep.splice(policy.keepLast)
    for (const rec of trimmed) {
      remove.push(rec)
      reason.push({ id: rec.id, cause: 'beyond_keep_last' })
    }
  }

  return { keep, delete: remove, reason }
}

export const parseSnapshotRetentionPolicy = (input: unknown): SnapshotRetentionPolicy =>
  SnapshotRetentionPolicy.parse(input)
export const safeParseSnapshotRetentionPolicy = (input: unknown) =>
  SnapshotRetentionPolicy.safeParse(input)
