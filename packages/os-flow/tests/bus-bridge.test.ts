import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus, parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  createBusOnEvent,
  FLOW_EVENT_TYPES,
  runFlow,
  type NodeHandlerMap,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-02T00:00:00.000Z',
})

describe('FLOW_EVENT_TYPES', () => {
  it('exposes 6 stable types', () => {
    expect(FLOW_EVENT_TYPES.length).toBe(6)
    expect(FLOW_EVENT_TYPES).toContain('flow.node.started')
    expect(FLOW_EVENT_TYPES).toContain('flow.node.completed')
    expect(FLOW_EVENT_TYPES).toContain('flow.node.failed')
    expect(FLOW_EVENT_TYPES).toContain('flow.node.paused')
    expect(FLOW_EVENT_TYPES).toContain('flow.node.skipped')
    expect(FLOW_EVENT_TYPES).toContain('flow.node.resumed')
  })
})

describe('createBusOnEvent', () => {
  it('publishes flow.node.started on node:start', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.started', handler)
    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({ kind: 'node:start', nodeId: 'n1' })
    expect(handler).toHaveBeenCalledOnce()
    const event = handler.mock.calls[0]![0]
    expect(event.type).toBe('flow.node.started')
    expect(event.workspaceId).toBe('team-a')
    expect(event.traceId).toBe('run_1')
    expect(event.spanId).toBe('n1')
    expect(event.data.nodeId).toBe('n1')
  })

  it('maps ok outcome → flow.node.completed', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.completed', handler)
    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({
      kind: 'node:end',
      nodeId: 'n1',
      outcome: { kind: 'ok', value: 42 },
    })
    expect(handler).toHaveBeenCalledOnce()
    const event = handler.mock.calls[0]![0]
    expect(event.data.value).toBe(42)
  })

  it('maps failed outcome → flow.node.failed with error fields', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.failed', handler)
    await createBusOnEvent({ bus, ctx })({
      kind: 'node:end',
      nodeId: 'n1',
      outcome: { kind: 'failed', error: { code: 'tool.timeout', message: 'too slow' } },
    })
    const event = handler.mock.calls[0]![0]
    expect(event.data.errorCode).toBe('tool.timeout')
    expect(event.data.errorMessage).toBe('too slow')
  })

  it('maps paused outcome → flow.node.paused', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.paused', handler)
    await createBusOnEvent({ bus, ctx })({
      kind: 'node:end',
      nodeId: 'n1',
      outcome: { kind: 'paused', reason: 'hitl' },
    })
    expect(handler.mock.calls[0]![0].data.pauseReason).toBe('hitl')
  })

  it('maps skipped outcome → flow.node.skipped', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.skipped', handler)
    await createBusOnEvent({ bus, ctx })({
      kind: 'node:end',
      nodeId: 'n1',
      outcome: { kind: 'skipped', reason: 'dry_run' },
    })
    expect(handler.mock.calls[0]![0].data.skipReason).toBe('dry_run')
  })

  it('maps node:resumed → flow.node.resumed', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.resumed', handler)
    await createBusOnEvent({ bus, ctx })({
      kind: 'node:resumed',
      nodeId: 'n1',
      outcome: { kind: 'ok', value: 1 },
    })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('handles unserializable values defensively', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.node.completed', handler)
    const cycle: { self?: unknown } = {}
    cycle.self = cycle
    await createBusOnEvent({ bus, ctx })({
      kind: 'node:end',
      nodeId: 'n1',
      outcome: { kind: 'ok', value: cycle },
    })
    expect(handler.mock.calls[0]![0].data.value).toBe('[unserializable]')
  })

  it('uses custom source URI when provided', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.*', handler)
    await createBusOnEvent({ bus, ctx, source: 'agentskitos://custom/x' })({
      kind: 'node:start',
      nodeId: 'n1',
    })
    expect(handler.mock.calls[0]![0].source).toBe('agentskitos://custom/x')
  })

  it('uses injected newEventId + now', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.*', handler)
    await createBusOnEvent({
      bus,
      ctx,
      newEventId: () => '01HFIXEDFIXEDFIXEDFIXEDFIXED',
      now: () => '2099-01-01T00:00:00.000Z',
    })({ kind: 'node:start', nodeId: 'n1' })
    const event = handler.mock.calls[0]![0]
    expect(event.id).toBe('01HFIXEDFIXEDFIXEDFIXEDFIXED')
    expect(event.time).toBe('2099-01-01T00:00:00.000Z')
  })
})

describe('integration: runFlow + bus bridge', () => {
  it('streams full lifecycle to bus subscribers', async () => {
    const flow = parseFlowConfig({
      id: 'f',
      name: 'F',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 'echo' },
        { id: 'b', kind: 'tool', tool: 'echo' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    })
    const handlers: NodeHandlerMap = {
      tool: async () => ({ kind: 'ok', value: 'ok' }),
    }
    const bus = new InMemoryEventBus()
    const seen: string[] = []
    bus.subscribe('flow.*', (e) => {
      seen.push(`${e.type}:${(e.data as { nodeId?: string }).nodeId}`)
    })
    const onEvent = createBusOnEvent({ bus, ctx })
    await runFlow(flow, { handlers, ctx, onEvent })
    expect(seen).toEqual([
      'flow.node.started:a',
      'flow.node.completed:a',
      'flow.node.started:b',
      'flow.node.completed:b',
    ])
  })
})
