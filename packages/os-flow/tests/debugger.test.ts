import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  createInMemoryDebugger,
  runFlow,
  type NodeHandlerMap,
  type NodeOutcome,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_debug',
  startedAt: '2026-05-04T00:00:00.000Z',
})

const flow = parseFlowConfig({
  id: 'debug-flow',
  name: 'Debug Flow',
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

describe('flow debugger', () => {
  it('pauses before executing a breakpoint node', async () => {
    const debuggerControl = createInMemoryDebugger()
    debuggerControl.setBreakpoints(['b'])
    const calls: string[] = []
    const events: string[] = []
    const handlers: NodeHandlerMap = {
      tool: async (node) => {
        calls.push(node.id)
        return { kind: 'ok', value: node.id }
      },
    }

    const result = await runFlow(flow, {
      handlers,
      ctx,
      debugger: debuggerControl,
      onEvent: (event) => events.push(`${event.kind}:${event.nodeId}`),
    })

    expect(result.status).toBe('paused')
    expect(result.stoppedAt).toBe('b')
    expect(result.reason).toBe('breakpoint')
    expect(result.executedOrder).toEqual(['a'])
    expect(calls).toEqual(['a'])
    expect(events).toContain('node:break:b')
  })

  it('applies a mock without invoking the node handler', async () => {
    const debuggerControl = createInMemoryDebugger()
    const mocked: NodeOutcome = { kind: 'ok', value: 'mocked-b' }
    debuggerControl.setMock('b', mocked)
    const handler = vi.fn(async (node: { id: string }) => ({ kind: 'ok' as const, value: node.id }))
    const events: string[] = []

    const result = await runFlow(flow, {
      handlers: { tool: handler },
      ctx,
      debugger: debuggerControl,
      onEvent: (event) => events.push(`${event.kind}:${event.nodeId}`),
    })

    expect(result.status).toBe('completed')
    expect(result.outcomes.get('b')).toEqual(mocked)
    expect(handler.mock.calls.map(([node]) => node.id)).toEqual(['a', 'c'])
    expect(events).toContain('node:mock-applied:b')
  })

  it('single-step mode pauses before the next node', async () => {
    const debuggerControl = createInMemoryDebugger()
    debuggerControl.step()

    const first = await runFlow(flow, {
      handlers: { tool: async (node) => ({ kind: 'ok', value: node.id }) },
      ctx,
      debugger: debuggerControl,
    })

    expect(first.status).toBe('paused')
    expect(first.executedOrder).toEqual(['a'])
    expect(first.stoppedAt).toBe('b')

    debuggerControl.step()
    const second = await runFlow(flow, {
      handlers: { tool: async (node) => ({ kind: 'ok', value: node.id }) },
      ctx,
      debugger: debuggerControl,
      seedOutcomes: first.outcomes,
    })

    expect(second.status).toBe('paused')
    expect(second.executedOrder).toEqual(['b'])
    expect(second.stoppedAt).toBe('c')
  })
})
