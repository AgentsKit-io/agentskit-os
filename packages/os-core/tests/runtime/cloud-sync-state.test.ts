import { describe, expect, it } from 'vitest'
import {
  computeSyncDelta,
  isSyncTransitionAllowed,
  transitionSyncState,
} from '../../src/index.js'

describe('cloud sync state machine (#122)', () => {
  it('allows idle→pulling and pulling→synced', () => {
    expect(isSyncTransitionAllowed('idle', 'pulling')).toBe(true)
    expect(isSyncTransitionAllowed('pulling', 'synced')).toBe(true)
  })

  it('rejects illegal transition', () => {
    expect(isSyncTransitionAllowed('synced', 'pulling')).toBe(false)
    const r = transitionSyncState('synced', 'pulling')
    expect(r.ok).toBe(false)
  })
})

describe('computeSyncDelta (#122)', () => {
  it('reports inSync when both maps match', () => {
    const m = new Map([['a', 'h1'], ['b', 'h2']])
    const d = computeSyncDelta(m, new Map(m))
    expect(d.inSync).toBe(true)
  })

  it('flags localOnly + remoteOnly + diverged buckets', () => {
    const local = new Map([['a', 'h1'], ['b', 'h2'], ['c', 'h3']])
    const remote = new Map([['b', 'hX'], ['c', 'h3'], ['d', 'h4']])
    const d = computeSyncDelta(local, remote)
    expect(d.localOnly).toEqual(['a'])
    expect(d.remoteOnly).toEqual(['d'])
    expect(d.diverged.map((x) => x.id)).toEqual(['b'])
    expect(d.inSync).toBe(false)
  })
})
