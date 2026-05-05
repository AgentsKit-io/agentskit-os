// Tests for #199 — cost stream cancel signal (engine half)
import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus, parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  runFlow,
  createBusOnEvent,
  type NodeHandlerMap,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_cancel',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const linear = parseFlowConfig({
  id: 'f-cancel',
  name: 'Cancel Flow',
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

describe('runFlow AbortSignal cancellation', () => {
  it('cancel before run starts returns cancelled immediately', async () => {
    const controller = new AbortController()
    controller.abort()
    const onEvent = vi.fn()

    const r = await runFlow(linear, {
      handlers: okHandlers,
      ctx,
      signal: controller.signal,
      onEvent,
    })

    expect(onEvent).toHaveBeenCalledWith({ kind: 'run:cancelled', reason: 'os.flow.cancelled' })
    expect(r.status).toBe('cancelled')
    expect(r.reason).toBe('os.flow.cancelled')
    expect(r.executedOrder).toEqual([])
    expect(r.outcomes.size).toBe(0)
  })

  it('cancel mid-run stops after current node', async () => {
    const controller = new AbortController()
    const executed: string[] = []
    const onEvent = vi.fn()

    const handlers: NodeHandlerMap = {
      tool: async (n) => {
        executed.push(n.id)
        // Abort after executing node 'a'
        if (n.id === 'a') controller.abort()
        return { kind: 'ok', value: n.id }
      },
    }

    const r = await runFlow(linear, {
      handlers,
      ctx,
      signal: controller.signal,
      onEvent,
    })

    expect(onEvent).toHaveBeenCalledWith({ kind: 'run:cancelled', reason: 'os.flow.cancelled' })
    // 'a' ran, then signal checked before 'b' → cancelled
    expect(r.status).toBe('cancelled')
    expect(r.reason).toBe('os.flow.cancelled')
    expect(r.executedOrder).toContain('a')
    expect(r.executedOrder).not.toContain('b')
    expect(r.stoppedAt).toBe('b')
  })

  it('cancel after completion is a no-op — run is already done', async () => {
    const controller = new AbortController()

    // Let the full run complete, then abort
    const r = await runFlow(linear, {
      handlers: okHandlers,
      ctx,
      signal: controller.signal,
    })

    controller.abort() // abort after run finishes — no effect on result
    expect(r.status).toBe('completed')
    expect(r.executedOrder).toEqual(['a', 'b', 'c'])
  })

  it('run without signal completes normally', async () => {
    const r = await runFlow(linear, { handlers: okHandlers, ctx })
    expect(r.status).toBe('completed')
  })
})

describe('bus-bridge: flow.run.cancelled event', () => {
  it('emits flow.run.cancelled when run:cancelled event is dispatched', async () => {
    const bus = new InMemoryEventBus()
    const received: string[] = []
    bus.subscribe('flow.run.cancelled', (e) => received.push(e.type))

    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({ kind: 'run:cancelled', reason: 'os.flow.cancelled' })

    expect(received).toHaveLength(1)
    expect(received[0]).toBe('flow.run.cancelled')
  })
})
