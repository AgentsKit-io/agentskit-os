import { describe, expect, it } from 'vitest'
import { createSelfHealingLedger } from '../../src/index.js'

const MIN = 60_000

describe('createSelfHealingLedger (#101)', () => {
  it('continues for crashes below the clone threshold', () => {
    const l = createSelfHealingLedger()
    expect(l.record({ agentId: 'a', at: 0 }).action).toBe('continue')
    expect(l.record({ agentId: 'a', at: 1 }).action).toBe('continue')
  })

  it('triggers clone-debug at 3rd crash', () => {
    const l = createSelfHealingLedger()
    l.record({ agentId: 'a', at: 0 })
    l.record({ agentId: 'a', at: 1 })
    const v = l.record({ agentId: 'a', at: 2 })
    expect(v.action).toBe('clone-debug')
    if (v.action === 'clone-debug') expect(v.cloneId).toContain('a-debug-')
  })

  it('quarantines at 5th crash', () => {
    const l = createSelfHealingLedger()
    for (let i = 0; i < 4; i += 1) l.record({ agentId: 'a', at: i })
    const v = l.record({ agentId: 'a', at: 5 })
    expect(v.action).toBe('quarantine')
  })

  it('decays the counter after the window elapses', () => {
    const l = createSelfHealingLedger({
      cloneAfterCrashes: 3,
      quarantineAfterCrashes: 5,
      windowMs: 10 * MIN,
    })
    l.record({ agentId: 'a', at: 0 })
    l.record({ agentId: 'a', at: 1 })
    l.record({ agentId: 'a', at: 2 })
    expect(l.count('a', 60 * MIN)).toBe(0)
    expect(l.record({ agentId: 'a', at: 60 * MIN + 1 }).action).toBe('continue')
  })

  it('reset clears the counter', () => {
    const l = createSelfHealingLedger()
    l.record({ agentId: 'a', at: 0 })
    l.reset('a')
    expect(l.count('a')).toBe(0)
  })
})
