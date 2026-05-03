// Tests for #205 — event-sourced RunSnapshot
import { describe, expect, it } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  runFlow,
  RunSnapshot,
  captureSnapshot,
  outcomesFromSnapshot,
  buildSnapshotEmitter,
  type NodeHandlerMap,
  type SnapshotInput,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_snap',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const linear = parseFlowConfig({
  id: 'f-snap',
  name: 'Snapshot Flow',
  entry: 'a',
  nodes: [
    { id: 'a', kind: 'tool', tool: 'echo' },
    { id: 'b', kind: 'tool', tool: 'echo' },
    { id: 'c', kind: 'tool', tool: 'echo' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
})

const okHandlers: NodeHandlerMap = {
  tool: async () => ({ kind: 'ok', value: 42 }),
}

describe('captureSnapshot', () => {
  it('creates a valid RunSnapshot from state', () => {
    const outcomes = new Map([['a', { kind: 'ok', value: 1 } as const]])
    const input: SnapshotInput = {
      runId: 'run_snap',
      flowId: 'f-snap',
      runMode: 'real',
      executedOrder: ['a'],
      outcomes,
      enabledSet: new Set(['b']),
      startedAt: '2026-05-02T00:00:00.000Z',
      now: () => '2026-05-02T00:00:01.000Z',
    }
    const snap = captureSnapshot(input)
    expect(snap.runId).toBe('run_snap')
    expect(snap.flowId).toBe('f-snap')
    expect(snap.executedOrder).toEqual(['a'])
    expect(snap.outcomes).toEqual([['a', { kind: 'ok', value: 1 }]])
    expect(snap.enabledSet).toEqual(['b'])
    expect(snap.snapshotAt).toBe('2026-05-02T00:00:01.000Z')
  })

  it('round-trips through Zod RunSnapshot schema', () => {
    const outcomes = new Map([
      ['a', { kind: 'ok', value: 1 } as const],
      ['b', { kind: 'skipped', reason: 'dry_run' } as const],
    ])
    const snap = captureSnapshot({
      runId: 'r',
      flowId: 'f',
      runMode: 'dry_run',
      executedOrder: ['a', 'b'],
      outcomes,
      enabledSet: new Set(['c']),
      startedAt: '2026-05-02T00:00:00.000Z',
    })
    // Parse through Zod to confirm schema is valid
    const parsed = RunSnapshot.parse(snap)
    expect(parsed.outcomes).toHaveLength(2)
    expect(parsed.outcomes[0]![0]).toBe('a')
    expect(parsed.outcomes[1]![0]).toBe('b')
  })
})

describe('outcomesFromSnapshot', () => {
  it('reconstructs a Map<string, NodeOutcome> from snapshot', () => {
    const snap = captureSnapshot({
      runId: 'r',
      flowId: 'f',
      runMode: 'real',
      executedOrder: ['a', 'b'],
      outcomes: new Map([
        ['a', { kind: 'ok', value: 10 } as const],
        ['b', { kind: 'failed', error: { code: 'err', message: 'oops' } } as const],
      ]),
      enabledSet: new Set(),
      startedAt: '2026-05-02T00:00:00.000Z',
    })
    const map = outcomesFromSnapshot(snap)
    expect(map.get('a')).toEqual({ kind: 'ok', value: 10 })
    expect(map.get('b')).toEqual({ kind: 'failed', error: { code: 'err', message: 'oops' } })
  })
})

describe('buildSnapshotEmitter', () => {
  it('fires after every node by default', () => {
    const snaps: unknown[] = []
    const emitter = buildSnapshotEmitter({ onSnapshot: (s) => snaps.push(s) })
    const base: SnapshotInput = {
      runId: 'r', flowId: 'f', runMode: 'real',
      executedOrder: ['a'],
      outcomes: new Map([['a', { kind: 'ok', value: 1 } as const]]),
      enabledSet: new Set(['b']),
      startedAt: '2026-05-02T00:00:00.000Z',
    }
    emitter(base)
    emitter({ ...base, executedOrder: ['a', 'b'] })
    expect(snaps).toHaveLength(2)
  })

  it('fires every N nodes when everyN is set', () => {
    const snaps: unknown[] = []
    const emitter = buildSnapshotEmitter({ onSnapshot: (s) => snaps.push(s), everyN: 2 })
    const base: SnapshotInput = {
      runId: 'r', flowId: 'f', runMode: 'real',
      executedOrder: [],
      outcomes: new Map(),
      enabledSet: new Set(),
      startedAt: '2026-05-02T00:00:00.000Z',
    }
    emitter(base) // count=1, 1 % 2 ≠ 0, no emit
    emitter(base) // count=2, 2 % 2 = 0, emit
    emitter(base) // count=3, no emit
    expect(snaps).toHaveLength(1)
  })
})

describe('runFlow snapshot integration', () => {
  it('emits snapshots in topo order', async () => {
    const snaps: import('../src/snapshot.js').RunSnapshot[] = []
    await runFlow(linear, {
      handlers: okHandlers,
      ctx,
      snapshot: { onSnapshot: (s) => snaps.push(s) },
    })
    // One snapshot per node
    expect(snaps).toHaveLength(3)
    expect(snaps[0]!.executedOrder).toEqual(['a'])
    expect(snaps[1]!.executedOrder).toEqual(['a', 'b'])
    expect(snaps[2]!.executedOrder).toEqual(['a', 'b', 'c'])
  })

  it('respects everyN=2', async () => {
    const snaps: import('../src/snapshot.js').RunSnapshot[] = []
    await runFlow(linear, {
      handlers: okHandlers,
      ctx,
      snapshot: { onSnapshot: (s) => snaps.push(s), everyN: 2 },
    })
    // 3 nodes, everyN=2 → fires at nodes 2 only (count 2); count 1 and 3 skip
    expect(snaps).toHaveLength(1)
    expect(snaps[0]!.executedOrder).toEqual(['a', 'b'])
  })

  it('snapshot outcomes round-trip through Zod', async () => {
    const snaps: import('../src/snapshot.js').RunSnapshot[] = []
    await runFlow(linear, {
      handlers: okHandlers,
      ctx,
      snapshot: { onSnapshot: (s) => snaps.push(s) },
    })
    const lastSnap = snaps[snaps.length - 1]!
    const reparsed = RunSnapshot.parse(lastSnap)
    expect(reparsed.outcomes).toHaveLength(3)
    const map = outcomesFromSnapshot(reparsed)
    expect(map.get('a')).toEqual({ kind: 'ok', value: 42 })
  })
})
