/**
 * Offline-first marketplace cache primitive.
 *
 * The desktop / CLI marketplace UIs talk to a remote catalog, but in
 * air-gap or offline-first mode they must fall back to a last-known-good
 * snapshot rather than failing the surface. This module defines:
 *
 *   - `MarketplaceCacheEntry` — schema for a single cached template entry
 *   - `MarketplaceCacheSnapshot` — schema for the full snapshot (ordered)
 *   - `decideMarketplaceSource` — pure decision rule, picks `'live'`,
 *     `'cache'`, or `'unavailable'` given network + cache state
 *   - `mergeMarketplaceSnapshot` — produces a new snapshot from a prior
 *     cache + fresh entries, preserving entries the live source omitted
 *     so an in-flight de-list does not lose offline access
 */

import { z } from 'zod'

export const MarketplaceCacheEntry = z.object({
  /** Stable template id (slug). */
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]{0,126}[a-z0-9]$/),
  version: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  intent: z.string().min(1).max(512),
  /** Hash of the canonical template body — used to detect drift. */
  contentHash: z.string().regex(/^sha256:[0-9a-f]{32,64}$/),
  /** ISO timestamp this entry was last refreshed from the live source. */
  cachedAt: z.string().datetime(),
})
export type MarketplaceCacheEntry = z.infer<typeof MarketplaceCacheEntry>

export const MarketplaceCacheSnapshot = z.object({
  generatedAt: z.string().datetime(),
  /** Live source URL or identifier — never an API key. */
  sourceId: z.string().min(1).max(256),
  entries: z.array(MarketplaceCacheEntry).max(10_000),
})
export type MarketplaceCacheSnapshot = z.infer<typeof MarketplaceCacheSnapshot>

export type MarketplaceSourceDecision =
  | { kind: 'live' }
  | { kind: 'cache'; reason: 'offline' | 'stale-live' | 'forced' }
  | { kind: 'unavailable'; reason: string }

export type MarketplaceDecisionInputs = {
  readonly online: boolean
  readonly forceOffline: boolean
  readonly liveOk: boolean
  readonly cacheAvailable: boolean
}

/**
 * Decide which source to read from for the marketplace UI.
 *
 *   - `forceOffline` (e.g. air-gap mode) wins; only the cache is allowed.
 *   - When offline or the live fetch failed, fall back to cache.
 *   - When everything is available, prefer live.
 *   - When neither is available, return unavailable with a reason.
 */
export const decideMarketplaceSource = (
  inputs: MarketplaceDecisionInputs,
): MarketplaceSourceDecision => {
  if (inputs.forceOffline) {
    if (inputs.cacheAvailable) return { kind: 'cache', reason: 'forced' }
    return {
      kind: 'unavailable',
      reason: 'air-gap mode is enabled and no cached marketplace snapshot is available',
    }
  }
  if (!inputs.online) {
    if (inputs.cacheAvailable) return { kind: 'cache', reason: 'offline' }
    return {
      kind: 'unavailable',
      reason: 'offline and no cached marketplace snapshot is available',
    }
  }
  if (inputs.liveOk) return { kind: 'live' }
  if (inputs.cacheAvailable) return { kind: 'cache', reason: 'stale-live' }
  return {
    kind: 'unavailable',
    reason: 'live marketplace is unreachable and no cached snapshot is available',
  }
}

const indexEntries = (
  entries: readonly MarketplaceCacheEntry[],
): ReadonlyMap<string, MarketplaceCacheEntry> => {
  const map = new Map<string, MarketplaceCacheEntry>()
  for (const entry of entries) map.set(entry.id, entry)
  return map
}

/**
 * Merge a fresh fetch of marketplace entries with an existing cache. Fresh
 * entries replace stale ones; entries present in the previous cache but
 * missing from the fresh fetch are preserved so a transient blip in the
 * live source does not erase offline access. The merged list is sorted by
 * id for determinism.
 */
export const mergeMarketplaceSnapshot = (args: {
  readonly previous: MarketplaceCacheSnapshot | undefined
  readonly fresh: readonly MarketplaceCacheEntry[]
  readonly sourceId: string
  readonly generatedAt: string
}): MarketplaceCacheSnapshot => {
  const merged = new Map<string, MarketplaceCacheEntry>()
  if (args.previous) {
    for (const entry of args.previous.entries) merged.set(entry.id, entry)
  }
  const fresh = indexEntries(args.fresh)
  for (const [id, entry] of fresh) merged.set(id, entry)

  const entries = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id))
  return {
    generatedAt: args.generatedAt,
    sourceId: args.sourceId,
    entries,
  }
}

export const parseMarketplaceCacheSnapshot = (input: unknown): MarketplaceCacheSnapshot =>
  MarketplaceCacheSnapshot.parse(input)
