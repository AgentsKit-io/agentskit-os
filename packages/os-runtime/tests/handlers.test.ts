import { describe, expect, it, vi } from 'vitest'
import { parseAgentConfig, parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  buildLiveHandlers,
  createAgentHandler,
  createConditionHandler,
  createHumanHandler,
  createToolHandler,
  safeBooleanEval,
  type LlmAdapter,
  type ToolExecutor,
  type HumanReviewer,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const agent = parseAgentConfig({
  id: 'researcher',
  name: 'R',
  model: { provider: 'openai', model: 'gpt-4o', temperature: 0.5 },
  systemPrompt: 'You are helpful.',
})

const flow = parseFlowConfig({
  id: 'f',
  name: 'F',
  entry: 'a',
  nodes: [
    { id: 'a', kind: 'agent', agent: 'researcher' },
    { id: 't', kind: 'tool', tool: 'echo' },
    { id: 'h', kind: 'human', prompt: 'Approve?' },
    { id: 'c', kind: 'condition', expression: 'flag == true' },
    { id: 'p', kind: 'parallel', branches: ['t', 'h'] },
  ],
  edges: [],
})

const agentNode = flow.nodes[0] as Extract<(typeof flow.nodes)[number], { kind: 'agent' }>
const toolNode = flow.nodes[1] as Extract<(typeof flow.nodes)[number], { kind: 'tool' }>
const humanNode = flow.nodes[2] as Extract<(typeof flow.nodes)[number], { kind: 'human' }>
const condNode = flow.nodes[3] as Extract<(typeof flow.nodes)[number], { kind: 'condition' }>

describe('createAgentHandler', () => {
  it('returns ok with LLM text', async () => {
    const llm: LlmAdapter = {
      id: 'fake',
      invoke: vi.fn(async () => ({ text: 'hello', finishReason: 'stop' })),
    }
    const h = createAgentHandler(() => agent, llm)
    const out = await h(agentNode, 'hi', ctx)
    expect(out).toEqual({ kind: 'ok', value: 'hello' })
    expect(llm.invoke).toHaveBeenCalledOnce()
  })

  it('fails when agent not in workspace', async () => {
    const h = createAgentHandler(() => undefined, {
      id: 'fake',
      invoke: async () => ({ text: '', finishReason: 'stop' }),
    })
    const out = await h(agentNode, undefined, ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('agent.not_found')
  })

  it('captures LLM exceptions', async () => {
    const llm: LlmAdapter = {
      id: 'fake',
      invoke: async () => {
        throw new Error('boom')
      },
    }
    const h = createAgentHandler(() => agent, llm)
    const out = await h(agentNode, 'hi', ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('agent.llm_failed')
  })

  it('forwards model params', async () => {
    const calls: unknown[] = []
    const llm: LlmAdapter = {
      id: 'fake',
      invoke: async (c) => {
        calls.push(c)
        return { text: 'ok', finishReason: 'stop' }
      },
    }
    const h = createAgentHandler(() => agent, llm)
    await h(agentNode, 'in', ctx)
    expect(calls[0]).toMatchObject({ temperature: 0.5, model: 'gpt-4o' })
  })
})

describe('createToolHandler', () => {
  it('returns ok on tool success', async () => {
    const exec: ToolExecutor = {
      knows: () => true,
      invoke: async () => ({ kind: 'ok', value: 'pong' }),
    }
    const h = createToolHandler(exec)
    const out = await h(toolNode, undefined, ctx)
    expect(out).toEqual({ kind: 'ok', value: 'pong' })
  })

  it('fails when tool not registered', async () => {
    const exec: ToolExecutor = {
      knows: () => false,
      invoke: async () => ({ kind: 'ok', value: null }),
    }
    const out = await createToolHandler(exec)(toolNode, undefined, ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('tool.not_registered')
  })

  it('propagates tool error code', async () => {
    const exec: ToolExecutor = {
      knows: () => true,
      invoke: async () => ({ kind: 'error', code: 'tool.timeout', message: 'too slow' }),
    }
    const out = await createToolHandler(exec)(toolNode, undefined, ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('tool.timeout')
  })

  it('captures executor throws', async () => {
    const exec: ToolExecutor = {
      knows: () => true,
      invoke: async () => {
        throw new Error('explode')
      },
    }
    const out = await createToolHandler(exec)(toolNode, undefined, ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('tool.threw')
  })
})

describe('createHumanHandler', () => {
  it('returns ok on approved', async () => {
    const reviewer: HumanReviewer = {
      request: async () => ({ decision: 'approved', note: 'lgtm' }),
    }
    const out = await createHumanHandler(reviewer)(humanNode, undefined, ctx)
    expect(out.kind).toBe('ok')
  })

  it('returns failed on rejected', async () => {
    const reviewer: HumanReviewer = {
      request: async () => ({ decision: 'rejected', note: 'nope' }),
    }
    const out = await createHumanHandler(reviewer)(humanNode, undefined, ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('hitl.rejected')
  })

  it('returns paused on pending', async () => {
    const reviewer: HumanReviewer = {
      request: async () => ({ decision: 'pending', ticketId: 't_1' }),
    }
    const out = await createHumanHandler(reviewer)(humanNode, undefined, ctx)
    expect(out.kind).toBe('paused')
    if (out.kind === 'paused') expect(out.reason).toBe('hitl')
  })
})

describe('safeBooleanEval', () => {
  it.each([
    ['true', {}, true],
    ['false', {}, false],
    ['flag', { flag: true }, true],
    ['flag', { flag: false }, false],
    ["status == 'ok'", { status: 'ok' }, true],
    ['count == 5', { count: 5 }, true],
    ['count == 5', { count: 6 }, false],
    ['flag == true', { flag: true }, true],
  ] as const)('evaluates expression', (expr, scope, expected) => {
    expect(safeBooleanEval(expr, scope as Record<string, unknown>)).toBe(expected)
  })

  it('rejects unsupported syntax', () => {
    expect(safeBooleanEval('a + b', {})).toBe(false)
  })
})

describe('createConditionHandler', () => {
  it('uses safeBooleanEval by default', async () => {
    const h = createConditionHandler()
    const out = await h(condNode, { flag: true }, ctx)
    expect(out).toEqual({ kind: 'ok', value: true })
  })

  it('uses custom evaluator', async () => {
    const h = createConditionHandler(async () => true)
    const out = await h(condNode, undefined, ctx)
    expect(out).toEqual({ kind: 'ok', value: true })
  })

  it('captures evaluator throws', async () => {
    const h = createConditionHandler(async () => {
      throw new Error('bad expr')
    })
    const out = await h(condNode, undefined, ctx)
    expect(out.kind).toBe('failed')
  })
})

describe('buildLiveHandlers', () => {
  it('produces handlers for provided adapters', () => {
    const llm: LlmAdapter = {
      id: 'x',
      invoke: async () => ({ text: '', finishReason: 'stop' }),
    }
    const tool: ToolExecutor = { knows: () => true, invoke: async () => ({ kind: 'ok', value: 1 }) }
    const handlers = buildLiveHandlers({
      adapters: { llm, tool },
      lookupAgent: () => agent,
    })
    expect(handlers.agent).toBeDefined()
    expect(handlers.tool).toBeDefined()
    expect(handlers.condition).toBeDefined()
    expect(handlers.parallel).toBeDefined()
    expect(handlers.human).toBeUndefined()
  })

  it('always provides condition + parallel', () => {
    const handlers = buildLiveHandlers({
      adapters: {},
      lookupAgent: () => undefined,
    })
    expect(handlers.condition).toBeDefined()
    expect(handlers.parallel).toBeDefined()
    expect(handlers.agent).toBeUndefined()
  })
})
