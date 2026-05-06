import { describe, expect, it } from 'vitest'
import {
  evaluateInstall,
  searchListings,
  type MarketplaceListing,
} from '../src/listing.js'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

const NOW = Date.parse('2026-05-06T12:00:00Z')

const fixture: readonly MarketplaceListing[] = [
  {
    id: 'fix-bot',
    name: 'Fix Bot',
    description: 'Auto-fix common bugs',
    author: 'rebeca',
    version: '1.2.0',
    category: 'agents',
    tags: ['fix', 'productivity'],
    rating: 4.7,
    ratingCount: 120,
    installCount: 9_000,
    publishedAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    integrityHash: HASH_A,
  },
  {
    id: 'release-pipeline',
    name: 'Release Pipeline',
    description: 'Issue → PR pipeline template',
    author: 'core-team',
    version: '0.4.0',
    category: 'pipelines',
    tags: ['release', 'productivity'],
    rating: 4.5,
    ratingCount: 30,
    installCount: 1_200,
    publishedAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    integrityHash: HASH_B,
  },
  {
    id: 'cost-widget',
    name: 'Cost Widget',
    description: 'Live cost dashboard widget',
    author: 'rebeca',
    version: '0.1.0',
    category: 'widgets',
    tags: ['cost', 'observability'],
    rating: 4.0,
    ratingCount: 5,
    installCount: 50,
    publishedAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
    integrityHash: HASH_A,
  },
]

describe('searchListings (#82)', () => {
  it('keyword search hits name + description + tags', () => {
    const result = searchListings(fixture, { keyword: 'productivity' }, { clock: () => NOW })
    expect(result.map((l) => l.id)).toEqual(['fix-bot', 'release-pipeline'])
  })

  it('category filter narrows the result set', () => {
    const result = searchListings(fixture, { category: 'widgets' }, { clock: () => NOW })
    expect(result.map((l) => l.id)).toEqual(['cost-widget'])
  })

  it('tag filter requires every supplied tag', () => {
    const result = searchListings(fixture, { tags: ['cost', 'observability'] }, { clock: () => NOW })
    expect(result.map((l) => l.id)).toEqual(['cost-widget'])
  })

  it('rank ordering surfaces high-rating high-install listings first', () => {
    const result = searchListings(fixture, {}, { clock: () => NOW })
    expect(result[0]?.id).toBe('fix-bot')
  })

  it('sort=recency orders by updatedAt desc', () => {
    const result = searchListings(fixture, { sort: 'recency' }, { clock: () => NOW })
    expect(result.map((l) => l.id)).toEqual(['fix-bot', 'cost-widget', 'release-pipeline'])
  })
})

describe('evaluateInstall (#82)', () => {
  it('passes when bundle integrity hash matches the listing', () => {
    const v = evaluateInstall({
      listing: fixture[0]!,
      bundleIntegrityHash: HASH_A,
      source: 'marketplace:fix-bot',
    })
    expect(v.ok).toBe(true)
  })

  it('rejects on integrity mismatch', () => {
    const v = evaluateInstall({
      listing: fixture[0]!,
      bundleIntegrityHash: HASH_B,
      source: 'marketplace:fix-bot',
    })
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.reason).toBe('integrity_mismatch')
    }
  })

  it('rejects pinned-version mismatch', () => {
    const v = evaluateInstall({
      listing: fixture[0]!,
      requestedVersion: '0.9.0',
      bundleIntegrityHash: HASH_A,
      source: 'marketplace:fix-bot',
    })
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.reason).toBe('version_mismatch')
    }
  })
})
