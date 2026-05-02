import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  InMemoryCheckpointStore,
  resumeFlow,
  type CheckpointStore,
  type NodeHandlerMap,
} from '../src/index.js'

const ctx = (runId = 'run_1') =>
  parseRunContext({
    runMode: 'real',
    workspaceId: 'team-a',
    runId,
    startedAt: '2026-05-02T00:00:00.000Z',
  })

const linear = parseFlowConfig({
  id: 'f',
  name: 'F',
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
  tool: async () => ({ kind: 'ok', value: 1 }),
}

describe('InMemoryCheckpointStore', () => {
  it('appends + loads in order', async () => {
    const s = new InMemoryCheckpointStore()
    await s.append({ runId: 'r', nodeId: 'a', outcome: { kind: 'ok', value: 1 }, recordedAt: 't' })
    await s.append({ runId: 'r', nodeId: 'b', outcome: { kind: 'ok', value: 2 }, recordedAt: 't' })
    const records = await s.load('r')
    expect(records.map((r) => r.nodeId)).toEqual(['a', 'b'])
  })

  it('isolates runs', async () => {
    const s = new InMemoryCheckpointStore()
    await s.append({ runId: 'r1', nodeId: 'a', outcome: { kind: 'ok', value: 1 }, recordedAt: 't' })
    await s.append({ runId: 'r2', nodeId: 'a', outcome: { kind: 'ok', value: 2 }, recordedAt: 't' })
    expect((await s.load('r1')).length).toBe(1)
    expect((await s.load('r2')).length).toBe(1)
  })

  it('clear removes one run only', async () => {
    const s = new InMemoryCheckpointStore()
    await s.append({ runId: 'r1', nodeId: 'a', outcome: { kind: 'ok', value: 1 }, recordedAt: 't' })
    await s.append({ runId: 'r2', nodeId: 'a', outcome: { kind: 'ok', value: 2 }, recordedAt: 't' })
    await s.clear('r1')
    expect((await s.load('r1')).length).toBe(0)
    expect((await s.load('r2')).length).toBe(1)
  })

  it('listRuns returns active run ids', async () => {
    const s = new InMemoryCheckpointStore()
    await s.append({ runId: 'r1', nodeId: 'a', outcome: { kind: 'ok', value: 1 }, recordedAt: 't' })
    await s.append({ runId: 'r2', nodeId: 'a', outcome: { kind: 'ok', value: 2 }, recordedAt: 't' })
    expect((await s.listRuns()).sort()).toEqual(['r1', 'r2'])
  })
})

describe('resumeFlow', () => {
  it('runs flow start to end on empty store', async () => {
    const store = new InMemoryCheckpointStore()
    const r = await resumeFlow(linear, { handlers: okHandlers, ctx: ctx(), store })
    expect(r.status).toBe('completed')
    expect(r.executedOrder).toEqual(['a', 'b', 'c'])
    expect(r.resumedFrom).toEqual([])
    expect((await store.load('run_1')).length).toBe(3)
  })

  it('resumes from checkpoint, skipping completed nodes', async () => {
    const store = new InMemoryCheckpointStore()
    await store.append({
      runId: 'run_2',
      nodeId: 'a',
      outcome: { kind: 'ok', value: 1 },
      recordedAt: 't',
    })
    const events: string[] = []
    const r = await resumeFlow(linear, {
      handlers: okHandlers,
      ctx: ctx('run_2'),
      store,
      onEvent: (e) => events.push(`${e.kind}:${e.nodeId}`),
    })
    expect(r.status).toBe('completed')
    expect(r.resumedFrom).toEqual(['a'])
    expect(r.executedOrder).toEqual(['b', 'c'])
    expect(events[0]).toBe('node:resumed:a')
  })

  it('continues from middle checkpoint', async () => {
    const store = new InMemoryCheckpointStore()
    await store.append({
      runId: 'run_3',
      nodeId: 'a',
      outcome: { kind: 'ok', value: 1 },
      recordedAt: 't',
    })
    await store.append({
      runId: 'run_3',
      nodeId: 'b',
      outcome: { kind: 'ok', value: 1 },
      recordedAt: 't',
    })
    const r = await resumeFlow(linear, { handlers: okHandlers, ctx: ctx('run_3'), store })
    expect(r.status).toBe('completed')
    expect(r.resumedFrom).toEqual(['a', 'b'])
    expect(r.executedOrder).toEqual(['c'])
  })

  it('does not resume past failed/paused outcome', async () => {
    const store = new InMemoryCheckpointStore()
    await store.append({
      runId: 'run_4',
      nodeId: 'a',
      outcome: { kind: 'ok', value: 1 },
      recordedAt: 't',
    })
    await store.append({
      runId: 'run_4',
      nodeId: 'b',
      outcome: { kind: 'failed', error: { code: 'x', message: 'y' } },
      recordedAt: 't',
    })
    // Resume picks up: only 'a' is resumable; 'b' breaks resume chain.
    const r = await resumeFlow(linear, { handlers: okHandlers, ctx: ctx('run_4'), store })
    expect(r.resumedFrom).toEqual(['a'])
    // 'b' will be re-executed (handler succeeds this time).
    expect(r.executedOrder).toEqual(['b', 'c'])
  })

  it('records every executed outcome to store', async () => {
    const store = new InMemoryCheckpointStore()
    await resumeFlow(linear, { handlers: okHandlers, ctx: ctx('run_5'), store })
    const records = await store.load('run_5')
    expect(records.map((r) => r.nodeId)).toEqual(['a', 'b', 'c'])
  })

  it('persists pause checkpoint', async () => {
    const store = new InMemoryCheckpointStore()
    const handlers: NodeHandlerMap = {
      tool: async (n) =>
        n.id === 'b'
          ? { kind: 'paused', reason: 'hitl' }
          : { kind: 'ok', value: 1 },
    }
    const r = await resumeFlow(linear, { handlers, ctx: ctx('run_6'), store })
    expect(r.status).toBe('paused')
    const records = await store.load('run_6')
    expect(records.map((r) => r.nodeId)).toEqual(['a', 'b'])
  })

  it('resume after pause continues from after pause point if pause replaced with success', async () => {
    const store = new InMemoryCheckpointStore()
    await store.append({
      runId: 'run_7',
      nodeId: 'a',
      outcome: { kind: 'ok', value: 1 },
      recordedAt: 't',
    })
    // Pause at b — not resumable.
    await store.append({
      runId: 'run_7',
      nodeId: 'b',
      outcome: { kind: 'paused', reason: 'hitl' },
      recordedAt: 't',
    })
    const r = await resumeFlow(linear, { handlers: okHandlers, ctx: ctx('run_7'), store })
    expect(r.resumedFrom).toEqual(['a'])
    expect(r.executedOrder).toEqual(['b', 'c'])
    expect(r.status).toBe('completed')
  })

  it('fails fast on graph audit issues', async () => {
    const store = new InMemoryCheckpointStore()
    const orphan = parseFlowConfig({
      id: 'f',
      name: 'F',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 't' },
        { id: 'orphan', kind: 'tool', tool: 't' },
      ],
      edges: [],
    })
    const r = await resumeFlow(orphan, { handlers: okHandlers, ctx: ctx(), store })
    expect(r.status).toBe('failed')
    expect(r.reason).toContain('graph_audit')
  })

  it('honors custom store implementation', async () => {
    const calls: string[] = []
    const custom: CheckpointStore = {
      append: vi.fn(async (r) => {
        calls.push(`append:${r.nodeId}`)
      }),
      load: vi.fn(async () => []),
      clear: vi.fn(async () => undefined),
    }
    await resumeFlow(linear, { handlers: okHandlers, ctx: ctx(), store: custom })
    expect(calls).toEqual(['append:a', 'append:b', 'append:c'])
  })
})
