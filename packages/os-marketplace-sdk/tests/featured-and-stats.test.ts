import { describe, expect, it } from 'vitest'
import {
  buildRatingHistogram,
  buildUsageStats,
  selectFeatured,
  type MarketplaceListing,
} from '../src/index.js'

const NOW = Date.parse('2026-05-06T12:00:00Z')
const HASH = 'a'.repeat(64)

const make = (id: string, over: Partial<MarketplaceListing> = {}): MarketplaceListing => ({
  id,
  name: id,
  description: '',
  author: 'rebeca',
  version: '1.0.0',
  category: 'agents',
  tags: [],
  rating: 4,
  ratingCount: 10,
  installCount: 100,
  publishedAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  integrityHash: HASH,
  ...over,
})

describe('selectFeatured (#86)', () => {
  it('editors-picks ranks by rating', () => {
    const r = selectFeatured(
      [make('a', { rating: 4.0 }), make('b', { rating: 4.9 }), make('c', { rating: 3.5 })],
      'editors-picks',
      { clock: () => NOW },
    )
    expect(r.listings.map((l) => l.id)).toEqual(['b', 'a', 'c'])
  })

  it('most-installed ranks by installCount', () => {
    const r = selectFeatured(
      [make('a', { installCount: 50 }), make('b', { installCount: 9_000 }), make('c', { installCount: 100 })],
      'most-installed',
      { clock: () => NOW },
    )
    expect(r.listings[0]?.id).toBe('b')
  })

  it('new filters to recently-published listings', () => {
    const r = selectFeatured(
      [
        make('old', { publishedAt: '2025-01-01T00:00:00Z' }),
        make('fresh', { publishedAt: '2026-05-01T00:00:00Z' }),
      ],
      'new',
      { clock: () => NOW },
    )
    expect(r.listings.map((l) => l.id)).toEqual(['fresh'])
  })
})

describe('buildRatingHistogram (#86)', () => {
  it('computes average + bucket counts', () => {
    const h = buildRatingHistogram('p1', { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 })
    expect(h.ratingCount).toBe(15)
    expect(h.average).toBeCloseTo(3.67, 1)
    expect(h.bucketCount.find((b) => b.bucket === 5)?.count).toBe(5)
  })
})

describe('buildUsageStats (#86)', () => {
  it('reports weekly growth rate', () => {
    const s = buildUsageStats('p1', { last7d: 200, previous7d: 100, last30d: 800 })
    expect(s.weeklyGrowthRate).toBeCloseTo(1.0)
  })

  it('handles previous7d=0 without dividing by zero', () => {
    const s = buildUsageStats('p1', { last7d: 5, previous7d: 0, last30d: 5 })
    expect(s.weeklyGrowthRate).toBe(1)
  })
})
