import { describe, expect, it } from 'vitest'
import {
  buildCostHeatMap,
  totalCostForTag,
  type CostHeatSample,
} from '../src/cost-heat-map.js'

const T0 = 1_700_000_000_000

const samples: readonly CostHeatSample[] = [
  { at: T0, costUsd: 0.10, tags: ['team:platform', 'env:prod'] },
  { at: T0 + 30_000, costUsd: 0.20, tags: ['team:platform'] },
  { at: T0 + 60_001, costUsd: 0.05, tags: ['team:platform'] },
  { at: T0 + 120_000, costUsd: 0.30, tags: ['team:growth'] },
  { at: T0, costUsd: 0.07, tags: ['env:prod'] }, // no team:* tag
]

describe('buildCostHeatMap (#110 + #196)', () => {
  it('aggregates by minute bucket and partitions by team:* tag', () => {
    const heat = buildCostHeatMap(samples, { bucket: 'minute', partitionTagPrefix: 'team:' })
    expect(heat.partitionTag).toBe('team:')
    const platformCells = heat.cells.filter((c) => c.tag === 'team:platform')
    expect(platformCells).toHaveLength(2)
    expect(platformCells[0]?.costUsd).toBeCloseTo(0.30)
    expect(platformCells[0]?.sampleCount).toBe(2)
    expect(platformCells[1]?.costUsd).toBeCloseTo(0.05)
  })

  it('totalCostForTag sums every cell for the tag', () => {
    const heat = buildCostHeatMap(samples, { bucket: 'minute', partitionTagPrefix: 'team:' })
    expect(totalCostForTag(heat, 'team:platform')).toBeCloseTo(0.35)
    expect(totalCostForTag(heat, 'team:growth')).toBeCloseTo(0.30)
  })

  it('drops samples without a matching partition tag', () => {
    const heat = buildCostHeatMap(samples, { bucket: 'hour', partitionTagPrefix: 'team:' })
    const tags = new Set(heat.cells.map((c) => c.tag))
    expect(tags.has('env:prod')).toBe(false)
  })

  it('honors empty prefix to include every tag', () => {
    const heat = buildCostHeatMap(samples, { bucket: 'day', partitionTagPrefix: '' })
    const tags = new Set(heat.cells.map((c) => c.tag))
    expect(tags).toContain('env:prod')
    expect(tags).toContain('team:platform')
  })
})
