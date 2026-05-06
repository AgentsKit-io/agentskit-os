// Per #86 — featured listings + ratings + usage stats.
// Pure: aggregator + selector helpers on top of MarketplaceListing.

import type { MarketplaceListing } from './listing.js'

export type FeaturedSlot =
  | 'editors-picks'
  | 'trending'
  | 'new'
  | 'most-installed'

export type FeaturedSelection = {
  readonly slot: FeaturedSlot
  readonly listings: readonly MarketplaceListing[]
}

export type RatingHistogram = {
  readonly listingId: string
  readonly ratingCount: number
  readonly average: number
  readonly bucketCount: readonly { readonly bucket: 1 | 2 | 3 | 4 | 5; readonly count: number }[]
}

export type UsageStats = {
  readonly listingId: string
  readonly installs7d: number
  readonly installs30d: number
  readonly weeklyGrowthRate: number
}

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60_000

const recencyMs = (l: MarketplaceListing, now: number): number => {
  const updated = Date.parse(l.updatedAt)
  return Number.isNaN(updated) ? Number.POSITIVE_INFINITY : now - updated
}

const isNew = (l: MarketplaceListing, now: number, windowMs: number): boolean => {
  const published = Date.parse(l.publishedAt)
  if (Number.isNaN(published)) return false
  return now - published <= windowMs
}

/**
 * Pick listings for a featured slot (#86). Pure: caller supplies the clock.
 */
export type FeaturedSelectOpts = {
  readonly clock?: () => number
  readonly limit?: number
}

export const selectFeatured = (
  listings: readonly MarketplaceListing[],
  slot: FeaturedSlot,
  opts: FeaturedSelectOpts = {},
): FeaturedSelection => {
  const now = (opts.clock ?? Date.now)()
  const limit = opts.limit ?? 8

  const sortedSlice = (sort: (a: MarketplaceListing, b: MarketplaceListing) => number) =>
    [...listings].sort(sort).slice(0, limit)

  if (slot === 'editors-picks') {
    return { slot, listings: sortedSlice((a, b) => b.rating - a.rating) }
  }
  if (slot === 'trending') {
    const fresh = listings.filter((l) => recencyMs(l, now) <= TRENDING_WINDOW_MS)
    return {
      slot,
      listings: [...fresh].sort((a, b) => b.installCount - a.installCount).slice(0, limit),
    }
  }
  if (slot === 'new') {
    const fresh = listings.filter((l) => isNew(l, now, 30 * 24 * 60 * 60_000))
    return {
      slot,
      listings: [...fresh].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, limit),
    }
  }
  return { slot, listings: sortedSlice((a, b) => b.installCount - a.installCount) }
}

/** Build a rating histogram from per-rating counts (#86). */
export const buildRatingHistogram = (
  listingId: string,
  buckets: { readonly 1: number; readonly 2: number; readonly 3: number; readonly 4: number; readonly 5: number },
): RatingHistogram => {
  const total = buckets[1] + buckets[2] + buckets[3] + buckets[4] + buckets[5]
  const sum = 1 * buckets[1] + 2 * buckets[2] + 3 * buckets[3] + 4 * buckets[4] + 5 * buckets[5]
  const average = total === 0 ? 0 : sum / total
  return {
    listingId,
    ratingCount: total,
    average: Math.round(average * 100) / 100,
    bucketCount: [1, 2, 3, 4, 5].map((b) => ({
      bucket: b as 1 | 2 | 3 | 4 | 5,
      count: buckets[b as 1 | 2 | 3 | 4 | 5],
    })),
  }
}

export type UsageStatsInput = {
  readonly last7d: number
  readonly previous7d: number
  readonly last30d: number
}

const computeGrowth = (last7d: number, previous7d: number): number => {
  if (previous7d === 0) return last7d > 0 ? 1 : 0
  return (last7d - previous7d) / previous7d
}

/** Compute usage-growth stats from raw install counts (#86). */
export const buildUsageStats = (
  listingId: string,
  installs: UsageStatsInput,
): UsageStats => {
  const growth = computeGrowth(installs.last7d, installs.previous7d)
  return {
    listingId,
    installs7d: installs.last7d,
    installs30d: installs.last30d,
    weeklyGrowthRate: Math.round(growth * 100) / 100,
  }
}
