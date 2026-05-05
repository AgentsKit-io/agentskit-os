export type RetentionPolicy = {
  readonly daily: number
  readonly weekly: number
  readonly monthly: number
}

export type SnapshotRef = {
  /** Identifier used in UI/output (often the filename). */
  readonly id: string
  /** ISO timestamp or any Date-parsable string. */
  readonly timestamp: string
}

const toDate = (ts: string): Date | null => {
  const d = new Date(ts)
  return Number.isFinite(d.getTime()) ? d : null
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const ymd = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`

// ISO week number in UTC (Monday-based), returns "YYYY-Www".
const isoWeekKey = (d: Date): string => {
  // Copy date and set to Thursday to determine ISO year.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7 // 1..7 (Mon..Sun)
  t.setUTCDate(t.getUTCDate() + (4 - day))
  const isoYear = t.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const diffDays = Math.floor((t.getTime() - yearStart.getTime()) / 86_400_000) + 1
  const week = Math.ceil(diffDays / 7)
  return `${isoYear}-W${pad2(week)}`
}

const ym = (d: Date): string => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`

export type RetentionPlan = {
  readonly keep: readonly SnapshotRef[]
  readonly delete: readonly SnapshotRef[]
  readonly skipped: readonly SnapshotRef[] // unparsable timestamps
}

/**
 * Compute a retention plan:
 * - Always keep the newest snapshot.
 * - Keep up to N distinct days (daily), ISO weeks (weekly), months (monthly).
 * - Prefer newer snapshots when multiple fall in the same bucket.
 */
export const planRetention = (
  refs: readonly SnapshotRef[],
  policy: RetentionPolicy,
): RetentionPlan => {
  const parsed = refs
    .map((r) => ({ r, d: toDate(r.timestamp) }))
    .filter((x): x is { r: SnapshotRef; d: Date } => x.d !== null)
    .sort((a, b) => b.d.getTime() - a.d.getTime())

  const skipped = refs.filter((r) => toDate(r.timestamp) === null)

  const keep: SnapshotRef[] = []
  const keepIds = new Set<string>()

  const keepOne = (r: SnapshotRef): void => {
    if (keepIds.has(r.id)) return
    keep.push(r)
    keepIds.add(r.id)
  }

  const newest = parsed[0]?.r
  if (newest) keepOne(newest)

  const seenDays = new Set<string>()
  const seenWeeks = new Set<string>()
  const seenMonths = new Set<string>()

  for (const { r, d } of parsed) {
    if (keepIds.has(r.id)) continue

    const dayKey = ymd(d)
    const weekKey = isoWeekKey(d)
    const monthKey = ym(d)

    const canDaily = policy.daily > 0 && seenDays.size < policy.daily && !seenDays.has(dayKey)
    const canWeekly = policy.weekly > 0 && seenWeeks.size < policy.weekly && !seenWeeks.has(weekKey)
    const canMonthly = policy.monthly > 0 && seenMonths.size < policy.monthly && !seenMonths.has(monthKey)

    if (canDaily || canWeekly || canMonthly) {
      keepOne(r)
      seenDays.add(dayKey)
      seenWeeks.add(weekKey)
      seenMonths.add(monthKey)
    }
  }

  const keepSet = new Set(keepIds)
  const del = refs.filter((r) => !keepSet.has(r.id) && toDate(r.timestamp) !== null)

  return { keep, delete: del, skipped }
}

