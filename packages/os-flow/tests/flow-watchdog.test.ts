import { describe, expect, it } from 'vitest'
import { evaluateFlowWatchdog } from '../src/flow-watchdog.js'

describe('evaluateFlowWatchdog (#240)', () => {
  it('marks live heartbeats as ok', () => {
    const v = evaluateFlowWatchdog(
      [{ runId: 'r1', startedAt: 1000, lastHeartbeatAt: 1900 }],
      { stallAfterMs: 200, hardKillAfterMs: 60_000, clock: () => 2000 },
    )
    expect(v[0]?.action).toBe('ok')
  })

  it('flags stalled runs for restart when restarts remain', () => {
    const v = evaluateFlowWatchdog(
      [{ runId: 'r1', startedAt: 1000, lastHeartbeatAt: 1100, restartCount: 0 }],
      { stallAfterMs: 200, hardKillAfterMs: 60_000, maxRestarts: 2, clock: () => 2000 },
    )
    expect(v[0]?.action).toBe('restart')
    expect(v[0]?.reason).toContain('stall')
  })

  it('escalates to kill when restart budget is spent', () => {
    const v = evaluateFlowWatchdog(
      [{ runId: 'r1', startedAt: 1000, lastHeartbeatAt: 1100, restartCount: 2 }],
      { stallAfterMs: 200, hardKillAfterMs: 60_000, maxRestarts: 2, clock: () => 2000 },
    )
    expect(v[0]?.action).toBe('kill')
    expect(v[0]?.reason).toContain('stall_max_restarts')
  })

  it('kills runs that exceed hardKillAfterMs even with fresh heartbeats', () => {
    const v = evaluateFlowWatchdog(
      [{ runId: 'r1', startedAt: 1000, lastHeartbeatAt: 60_900 }],
      { stallAfterMs: 200, hardKillAfterMs: 30_000, clock: () => 61_000 },
    )
    expect(v[0]?.action).toBe('kill')
    expect(v[0]?.reason).toContain('elapsed_over_hard_kill')
  })

  it('handles multiple runs in one pass', () => {
    const v = evaluateFlowWatchdog(
      [
        { runId: 'live', startedAt: 1000, lastHeartbeatAt: 1900 },
        { runId: 'stuck', startedAt: 1000, lastHeartbeatAt: 1100 },
      ],
      { stallAfterMs: 200, hardKillAfterMs: 60_000, clock: () => 2000 },
    )
    expect(v.find((x) => x.runId === 'live')?.action).toBe('ok')
    expect(v.find((x) => x.runId === 'stuck')?.action).toBe('restart')
  })
})
