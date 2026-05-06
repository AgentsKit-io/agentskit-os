import { describe, expect, it } from 'vitest'
import { replayBisect } from '../src/replay-bisect.js'

const history = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `change-${i}` }))

describe('replayBisect (#216)', () => {
  it('locates the culprit index with ~log2(n) probes', async () => {
    const culprit = 7
    const oracle = async (i: number) => (i >= culprit ? 'fail' : 'pass') as 'pass' | 'fail'
    const v = await replayBisect(history(16), oracle)
    expect(v.kind).toBe('culprit')
    if (v.kind === 'culprit') {
      expect(v.index).toBe(culprit)
      expect(v.probes).toBeLessThanOrEqual(8)
    }
  })

  it('reports all_clean when newest still passes', async () => {
    const v = await replayBisect(history(8), async () => 'pass')
    expect(v.kind).toBe('all_clean')
  })

  it('reports all_broken when oldest already fails', async () => {
    const v = await replayBisect(history(8), async () => 'fail')
    expect(v.kind).toBe('all_broken')
  })

  it('returns inconsistent when maxProbes is exhausted before convergence', async () => {
    const oracle = async (i: number) => (i >= 50 ? 'fail' : 'pass') as 'pass' | 'fail'
    const v = await replayBisect(history(100), oracle, { maxProbes: 3 })
    expect(v.kind).toBe('inconsistent')
  })
})
