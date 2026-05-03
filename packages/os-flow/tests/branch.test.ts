// Tests for #206 — branch-from-past-step replay
import { describe, expect, it } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  runFlow,
  branchFromSnapshot,
  captureSnapshot,
  FlowBranchError,
  type NodeHandlerMap,
} from '../src/index.js'

const ctx = (runId = 'run_branch') =>
  parseRunContext({
    runMode: 'real',
    workspaceId: 'team-a',
    runId,
    startedAt: '2026-05-02T00:00:00.000Z',
  })

const linear = parseFlowConfig({
  id: 'f-branch',
  name: 'Branch Flow',
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
  tool: async () => ({ kind: 'ok', value: 'original' }),
}

/** Helper: run the flow and capture the last snapshot. */
const captureFullSnapshot = async (flow: typeof linear, runId = 'run_branch') => {
  let lastSnap: import('../src/snapshot.js').RunSnapshot | undefined
  await runFlow(flow, {
    handlers: okHandlers,
    ctx: ctx(runId),
    snapshot: { onSnapshot: (s) => { lastSnap = s } },
  })
  return lastSnap!
}

describe('branchFromSnapshot', () => {
  it('rejects an invalid branch point', async () => {
    const snap = await captureFullSnapshot(linear)
    expect(() =>
      branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'nonexistent' }),
    ).toThrow(FlowBranchError)
    try {
      branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'nonexistent' })
    } catch (err) {
      expect((err as FlowBranchError).code).toBe('os.flow.invalid_branch_point')
    }
  })

  it('branches from entry node: no seeds, all nodes re-run', async () => {
    const snap = await captureFullSnapshot(linear)
    const branch = branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'a' })
    expect(branch.seedOutcomes.size).toBe(0)
    expect(branch.executedOrder).toEqual([])
    expect(branch.parentRunId).toBe('run_branch')
  })

  it('branches from middle node: prior outcomes seeded', async () => {
    const snap = await captureFullSnapshot(linear)
    const branch = branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'b' })
    expect(branch.seedOutcomes.size).toBe(1) // only 'a' is seeded
    expect(branch.seedOutcomes.has('a')).toBe(true)
    expect(branch.seedOutcomes.has('b')).toBe(false)
    expect(branch.executedOrder).toEqual(['a'])
  })

  it('branches from last node: a and b are seeded', async () => {
    const snap = await captureFullSnapshot(linear)
    const branch = branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'c' })
    expect(branch.seedOutcomes.size).toBe(2)
    expect(branch.seedOutcomes.has('a')).toBe(true)
    expect(branch.seedOutcomes.has('b')).toBe(true)
  })

  it('passes inputPatch and handlerOverrides through', async () => {
    const snap = await captureFullSnapshot(linear)
    const patchedHandlers: Partial<NodeHandlerMap> = {
      tool: async () => ({ kind: 'ok', value: 'patched' }),
    }
    const branch = branchFromSnapshot({
      snapshot: snap,
      flow: linear,
      branchPoint: 'b',
      override: { inputPatch: { x: 1 }, handlerOverrides: patchedHandlers },
    })
    expect(branch.initialInput).toEqual({ x: 1 })
    expect(branch.handlerOverrides).toBe(patchedHandlers)
  })
})

describe('runFlow with seedOutcomes (branch integration)', () => {
  it('continues from branch point — a is seeded, b and c run fresh', async () => {
    const snap = await captureFullSnapshot(linear, 'run_orig')
    const branch = branchFromSnapshot({ snapshot: snap, flow: linear, branchPoint: 'b' })

    const executed: string[] = []
    const r = await runFlow(linear, {
      handlers: okHandlers,
      ctx: ctx('run_new'),
      seedOutcomes: branch.seedOutcomes,
      onEvent: (e) => { if (e.kind === 'node:start') executed.push(e.nodeId) },
    })

    expect(r.status).toBe('completed')
    // 'a' should NOT have been re-run (it's seeded)
    expect(executed).not.toContain('a')
    // 'b' and 'c' should run
    expect(executed).toContain('b')
    expect(executed).toContain('c')
    expect(r.executedOrder).toEqual(['b', 'c'])
  })

  it('branch with inputPatch reaches downstream nodes', async () => {
    const flow = parseFlowConfig({
      id: 'f-patch',
      name: 'Patch Flow',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 'echo' },
        { id: 'b', kind: 'tool', tool: 'downstream' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    })

    const calls: string[] = []
    const handlers: NodeHandlerMap = {
      tool: async (n) => {
        calls.push(n.id)
        return { kind: 'ok', value: n.id }
      },
    }

    // Capture snapshot from original run
    let snap: import('../src/snapshot.js').RunSnapshot | undefined
    await runFlow(flow, {
      handlers,
      ctx: ctx('run_orig2'),
      snapshot: { onSnapshot: (s) => { snap = s } },
    })

    calls.length = 0 // reset
    const branch = branchFromSnapshot({ snapshot: snap!, flow, branchPoint: 'b', override: { inputPatch: 'new-input' } })

    const r = await runFlow(flow, {
      handlers,
      ctx: ctx('run_branch2'),
      seedOutcomes: branch.seedOutcomes,
      initialInput: branch.initialInput,
    })

    expect(r.status).toBe('completed')
    // 'a' should NOT re-run; 'b' should
    expect(calls).toEqual(['b'])
  })
})

describe('captureSnapshot for branch: branchPoint in executedOrder', () => {
  it('branchPoint must appear in snapshot.executedOrder to succeed', () => {
    // Create a partial snapshot (only node 'a' ran)
    const partialSnap = captureSnapshot({
      runId: 'r',
      flowId: 'f-branch',
      runMode: 'real',
      executedOrder: ['a'],
      outcomes: new Map([['a', { kind: 'ok', value: 1 } as const]]),
      enabledSet: new Set(['b']),
      startedAt: '2026-05-02T00:00:00.000Z',
    })

    // 'b' hasn't executed yet — should throw
    expect(() =>
      branchFromSnapshot({ snapshot: partialSnap, flow: linear, branchPoint: 'b' }),
    ).toThrow(FlowBranchError)
  })
})
