import { describe, expect, it } from 'vitest'
import {
  SnapshotRetentionPolicy,
  planSnapshotRetention,
  type SnapshotRecord,
} from '../../src/index.js'

const NOW = 1_700_000_000_000
const DAY = 24 * 60 * 60_000

const rec = (id: string, ageDays: number, bytes = 100): SnapshotRecord => ({
  id,
  takenAt: NOW - ageDays * DAY,
  bytes,
})

describe('planSnapshotRetention (#245)', () => {
  it('drops snapshots older than maxAgeDays', () => {
    const policy = SnapshotRetentionPolicy.parse({
      cadence: 'daily',
      keepLast: 100,
      maxAgeDays: 7,
    })
    const plan = planSnapshotRetention(
      [rec('fresh', 1), rec('old', 30)],
      policy,
      { clock: () => NOW },
    )
    expect(plan.keep.map((r) => r.id)).toEqual(['fresh'])
    expect(plan.delete.map((r) => r.id)).toEqual(['old'])
    expect(plan.reason[0]?.cause).toBe('older_than_max_age')
  })

  it('trims to keepLast newest snapshots', () => {
    const policy = SnapshotRetentionPolicy.parse({
      cadence: 'hourly',
      keepLast: 2,
      maxAgeDays: 30,
    })
    const plan = planSnapshotRetention(
      [rec('a', 1), rec('b', 2), rec('c', 3)],
      policy,
      { clock: () => NOW },
    )
    expect(plan.keep.map((r) => r.id)).toEqual(['a', 'b'])
    expect(plan.delete.map((r) => r.id)).toEqual(['c'])
    expect(plan.reason.find((r) => r.id === 'c')?.cause).toBe('beyond_keep_last')
  })

  it('keeps every snapshot when both rules pass', () => {
    const policy = SnapshotRetentionPolicy.parse({
      cadence: 'daily',
      keepLast: 100,
      maxAgeDays: 30,
    })
    const plan = planSnapshotRetention(
      [rec('a', 1), rec('b', 2)],
      policy,
      { clock: () => NOW },
    )
    expect(plan.delete).toEqual([])
  })
})
