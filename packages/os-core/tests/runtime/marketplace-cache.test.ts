import { describe, expect, it } from 'vitest'
import {
  MarketplaceCacheEntry,
  MarketplaceCacheSnapshot,
  decideMarketplaceSource,
  mergeMarketplaceSnapshot,
  parseMarketplaceCacheSnapshot,
} from '../../src/runtime/marketplace-cache.js'

const entry = (
  id: string,
  cachedAt = '2026-01-01T00:00:00.000Z',
  version = '1.0.0',
): MarketplaceCacheEntry => ({
  id,
  version,
  name: id,
  intent: `intent for ${id}`,
  contentHash: `sha256:${id.padEnd(32, '0')}`,
  cachedAt,
})

describe('decideMarketplaceSource', () => {
  it('forces cache when air-gap mode is enabled', () => {
    expect(
      decideMarketplaceSource({
        online: true,
        forceOffline: true,
        liveOk: true,
        cacheAvailable: true,
      }),
    ).toEqual({ kind: 'cache', reason: 'forced' })
  })

  it('reports unavailable when air-gap is on and no cache exists', () => {
    expect(
      decideMarketplaceSource({
        online: true,
        forceOffline: true,
        liveOk: true,
        cacheAvailable: false,
      }),
    ).toEqual({
      kind: 'unavailable',
      reason: 'air-gap mode is enabled and no cached marketplace snapshot is available',
    })
  })

  it('falls back to cache when offline', () => {
    expect(
      decideMarketplaceSource({
        online: false,
        forceOffline: false,
        liveOk: true,
        cacheAvailable: true,
      }),
    ).toEqual({ kind: 'cache', reason: 'offline' })
  })

  it('falls back to cache when live fetch fails', () => {
    expect(
      decideMarketplaceSource({
        online: true,
        forceOffline: false,
        liveOk: false,
        cacheAvailable: true,
      }),
    ).toEqual({ kind: 'cache', reason: 'stale-live' })
  })

  it('prefers live when everything is healthy', () => {
    expect(
      decideMarketplaceSource({
        online: true,
        forceOffline: false,
        liveOk: true,
        cacheAvailable: false,
      }),
    ).toEqual({ kind: 'live' })
  })

  it('reports unavailable when neither live nor cache is reachable', () => {
    expect(
      decideMarketplaceSource({
        online: true,
        forceOffline: false,
        liveOk: false,
        cacheAvailable: false,
      }),
    ).toEqual({
      kind: 'unavailable',
      reason: 'live marketplace is unreachable and no cached snapshot is available',
    })
  })
})

describe('mergeMarketplaceSnapshot', () => {
  it('produces a deterministic snapshot from fresh entries when there is no prior cache', () => {
    const snapshot = mergeMarketplaceSnapshot({
      previous: undefined,
      fresh: [entry('beta'), entry('alpha')],
      sourceId: 'https://marketplace.agentskit.io',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(snapshot.entries.map((e) => e.id)).toEqual(['alpha', 'beta'])
  })

  it('replaces stale entries with fresh ones', () => {
    const previous: MarketplaceCacheSnapshot = {
      generatedAt: '2025-12-31T00:00:00.000Z',
      sourceId: 'https://marketplace.agentskit.io',
      entries: [entry('alpha', '2025-12-31T00:00:00.000Z', '1.0.0')],
    }
    const merged = mergeMarketplaceSnapshot({
      previous,
      fresh: [entry('alpha', '2026-01-01T00:00:00.000Z', '1.1.0')],
      sourceId: previous.sourceId,
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(merged.entries[0]?.version).toBe('1.1.0')
    expect(merged.entries[0]?.cachedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('preserves entries the live source omitted (transient de-list resilience)', () => {
    const previous: MarketplaceCacheSnapshot = {
      generatedAt: '2025-12-31T00:00:00.000Z',
      sourceId: 'https://marketplace.agentskit.io',
      entries: [entry('alpha'), entry('beta')],
    }
    const merged = mergeMarketplaceSnapshot({
      previous,
      fresh: [entry('alpha', '2026-01-01T00:00:00.000Z')],
      sourceId: previous.sourceId,
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(merged.entries.map((e) => e.id)).toEqual(['alpha', 'beta'])
  })
})

describe('parseMarketplaceCacheSnapshot', () => {
  it('rejects non-hex content hashes', () => {
    expect(() =>
      parseMarketplaceCacheSnapshot({
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourceId: 'https://marketplace.agentskit.io',
        entries: [
          {
            id: 'alpha',
            version: '1.0.0',
            name: 'alpha',
            intent: 'intent',
            contentHash: 'plaintext-hash',
            cachedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects ids that do not match the slug regex', () => {
    expect(() =>
      parseMarketplaceCacheSnapshot({
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourceId: 'https://marketplace.agentskit.io',
        entries: [
          {
            id: 'NOT_A_SLUG',
            version: '1.0.0',
            name: 'alpha',
            intent: 'intent',
            contentHash: 'sha256:00000000000000000000000000000000',
            cachedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).toThrow()
  })
})
