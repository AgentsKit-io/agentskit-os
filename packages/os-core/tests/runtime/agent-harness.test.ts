import { describe, expect, it } from 'vitest'
import { createAgentHarness } from '../../src/index.js'

const fakeClock = () => {
  let t = 1000
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('createAgentHarness (#92)', () => {
  it('spawn assigns handle and starts in spawning state', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    expect(a.state).toBe('spawning')
    expect(a.agentId).toBe('fix-bot')
    expect(a.hostId).toBe('host-1')
    expect(h.get(a.handleId)?.state).toBe('spawning')
  })

  it('markRunning transitions spawning → running', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    expect(h.markRunning(a.handleId).state).toBe('running')
  })

  it('migrate moves running agent to a new host and remembers origin', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    h.markRunning(a.handleId)
    const migrated = h.migrate(a.handleId, 'host-2')
    expect(migrated.hostId).toBe('host-2')
    expect(migrated.migratedFrom).toBe('host-1')
    expect(migrated.state).toBe('running')
  })

  it('migrate refuses to move from non-running state', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    expect(() => h.migrate(a.handleId, 'host-2')).toThrow(/cannot migrate/)
  })

  it('kill records reason and timestamp', () => {
    const clock = fakeClock()
    const h = createAgentHarness({ clock: clock.now })
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    h.markRunning(a.handleId)
    clock.advance(50)
    const killed = h.kill(a.handleId, 'budget')
    expect(killed.state).toBe('killed')
    expect(killed.killedAt).toBe(1050)
    expect(h.audit().some((e) => e.kind === 'killed' && e.reason === 'budget')).toBe(true)
  })

  it('list filters by state / agentId / hostId', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'fix-bot', hostId: 'host-1' })
    const b = h.spawn({ agentId: 'review-bot', hostId: 'host-1' })
    h.markRunning(a.handleId)
    expect(h.list({ state: 'running' })).toHaveLength(1)
    expect(h.list({ agentId: 'review-bot' })[0]?.handleId).toBe(b.handleId)
    expect(h.list({ hostId: 'host-1' })).toHaveLength(2)
  })

  it('markFailed surfaces in audit and disallows further migration', () => {
    const h = createAgentHarness()
    const a = h.spawn({ agentId: 'x', hostId: 'host-1' })
    h.markRunning(a.handleId)
    h.markFailed(a.handleId, 'OOM')
    expect(h.get(a.handleId)?.state).toBe('failed')
    expect(() => h.migrate(a.handleId, 'host-2')).toThrow()
    const failed = h.audit().find((e) => e.kind === 'failed')
    expect(failed && failed.kind === 'failed' ? failed.error : '').toBe('OOM')
  })
})
