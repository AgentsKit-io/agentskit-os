// Per #82 — marketplace listing primitives + search/sort.
// Pure: no I/O. Builds the data shapes the desktop browser will render and
// the install verdict the 1-click flow runs before extracting a bundle.

export type ListingCategory = 'agents' | 'templates' | 'pipelines' | 'widgets' | 'other'

export type MarketplaceListing = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly author: string
  readonly version: string
  readonly category: ListingCategory
  readonly tags: readonly string[]
  readonly rating: number
  readonly ratingCount: number
  readonly installCount: number
  readonly publishedAt: string
  readonly updatedAt: string
  /** Hex-encoded SHA-256 of the canonical manifest, propagated from the SDK. */
  readonly integrityHash: string
}

export type ListingSearchQuery = {
  /** Free-text keyword applied to name + description + tags. */
  readonly keyword?: string
  readonly category?: ListingCategory
  /** Listing must carry every tag in this array. */
  readonly tags?: readonly string[]
  /** Sort ordering; defaults to ranking score. */
  readonly sort?: 'rank' | 'rating' | 'installs' | 'recency'
}

const norm = (s: string): string => s.toLowerCase()

const matchesKeyword = (l: MarketplaceListing, kw: string): boolean => {
  const needle = norm(kw)
  if (norm(l.name).includes(needle)) return true
  if (norm(l.description).includes(needle)) return true
  return l.tags.some((t) => norm(t).includes(needle))
}

const matchesTags = (l: MarketplaceListing, tags: readonly string[]): boolean => {
  if (tags.length === 0) return true
  const set = new Set(l.tags.map(norm))
  return tags.every((t) => set.has(norm(t)))
}

const recencyScore = (updatedAt: string, now: number): number => {
  const updated = Date.parse(updatedAt)
  if (Number.isNaN(updated)) return 0
  const ageDays = Math.max(0, (now - updated) / (1000 * 60 * 60 * 24))
  return 1 / (1 + ageDays / 30)
}

const rankScore = (l: MarketplaceListing, now: number): number => {
  const ratingComponent = l.ratingCount > 0 ? l.rating * Math.log10(l.ratingCount + 1) : 0
  const installComponent = Math.log10(l.installCount + 1)
  return ratingComponent * 2 + installComponent + recencyScore(l.updatedAt, now)
}

export type SearchOpts = {
  readonly clock?: () => number
}

/**
 * Filter + sort marketplace listings (#82). Pure: caller supplies the clock
 * for deterministic recency scoring in tests.
 */
export const searchListings = (
  listings: readonly MarketplaceListing[],
  query: ListingSearchQuery,
  opts: SearchOpts = {},
): readonly MarketplaceListing[] => {
  const now = (opts.clock ?? Date.now)()
  const filtered = listings.filter((l) => {
    if (query.category !== undefined && l.category !== query.category) return false
    if (query.keyword !== undefined && query.keyword.length > 0 && !matchesKeyword(l, query.keyword)) return false
    if (query.tags !== undefined && !matchesTags(l, query.tags)) return false
    return true
  })
  const sort = query.sort ?? 'rank'
  return [...filtered].sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'installs') return b.installCount - a.installCount
    if (sort === 'recency') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    return rankScore(b, now) - rankScore(a, now)
  })
}

export type InstallVerdictOk = {
  readonly ok: true
  readonly listingId: string
  readonly version: string
  readonly source: string
}

export type InstallVerdictFail = {
  readonly ok: false
  readonly listingId: string
  readonly reason: 'integrity_mismatch' | 'unknown_listing' | 'version_mismatch'
  readonly detail: string
}

export type InstallVerdict = InstallVerdictOk | InstallVerdictFail

export type EvaluateInstallArgs = {
  readonly listing: MarketplaceListing
  readonly requestedVersion?: string
  readonly bundleIntegrityHash: string
  readonly source: string
}

/**
 * Compute the install verdict for a 1-click install (#82). Wraps integrity
 * + version gate so the desktop install flow gets a single yes/no signal
 * before extracting a bundle on disk.
 */
export const evaluateInstall = (args: EvaluateInstallArgs): InstallVerdict => {
  const { listing, requestedVersion, bundleIntegrityHash, source } = args
  if (requestedVersion !== undefined && requestedVersion !== listing.version) {
    return {
      ok: false,
      listingId: listing.id,
      reason: 'version_mismatch',
      detail: `requested ${requestedVersion}, listing ${listing.version}`,
    }
  }
  if (bundleIntegrityHash.toLowerCase() !== listing.integrityHash.toLowerCase()) {
    return {
      ok: false,
      listingId: listing.id,
      reason: 'integrity_mismatch',
      detail: `expected ${listing.integrityHash}, got ${bundleIntegrityHash}`,
    }
  }
  return { ok: true, listingId: listing.id, version: listing.version, source }
}
