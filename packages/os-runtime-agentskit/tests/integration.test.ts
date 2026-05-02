// End-to-end: AgentsKit fakes → createAgentskitRegistry →
// buildLiveHandlers (os-runtime) → handler invocation.
//
// Locks the binding's wire shape against os-runtime's contract.

import { describe, expect, it } from 'vitest'
import {
  parseAgentConfig,
  parseFlowConfig,
  parseRunContext,
} from '@agentskit/os-core'
import { buildLiveHandlers } from '@agentskit/os-runtime'
import {
  createAgentskitRegistry,
  type AgentskitChatAdapter,
  type AgentskitMemoryStore,
  type AgentskitTool,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const agent = parseAgentConfig({
  id: 'critic',
  name: 'Critic',
  model: { provider: 'anthropic', model: 'claude-opus-4-7' },
  systemPrompt: 'You are a critic.',
})

const flow = parseFlowConfig({
  id: 'f',
  name: 'F',
  entry: 'a',
  nodes: [
    { id: 'a', kind: 'agent', agent: 'critic' },
    { id: 't', kind: 'tool', tool: 'echo', input: { text: 'hi' } },
  ],
  edges: [],
})

const agentNode = flow.nodes[0] as Extract<(typeof flow.nodes)[number], { kind: 'agent' }>
const toolNode = flow.nodes[1] as Extract<(typeof flow.nodes)[number], { kind: 'tool' }>

const llm: AgentskitChatAdapter = {
  id: 'anthropic',
  chat: async () => ({
    text: 'four stars',
    finishReason: 'stop',
    usage: { inputTokens: 10, outputTokens: 4, costUsd: 0.0001 },
  }),
}

const echo: AgentskitTool = {
  name: 'echo',
  execute: async (args) => ({ kind: 'ok', value: args }),
}

const memory: AgentskitMemoryStore = {
  id: 'mem',
  get: async () => undefined,
  set: async () => undefined,
}

describe('binding integration with buildLiveHandlers', () => {
  it('produces handler map with agent + tool wired', () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ llm, tools: [echo], memory }),
      lookupAgent: () => agent,
    })
    expect(handlers.agent).toBeDefined()
    expect(handlers.tool).toBeDefined()
    expect(handlers.condition).toBeDefined()
    expect(handlers.parallel).toBeDefined()
  })

  it('omits agent handler when llm not bound', () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ tools: [echo] }),
      lookupAgent: () => agent,
    })
    expect(handlers.agent).toBeUndefined()
    expect(handlers.tool).toBeDefined()
  })

  it('omits tool handler when no tools bound', () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ llm }),
      lookupAgent: () => agent,
    })
    expect(handlers.agent).toBeDefined()
    expect(handlers.tool).toBeUndefined()
  })

  it('agent handler invokes AgentsKit chat adapter end-to-end', async () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ llm }),
      lookupAgent: () => agent,
    })
    const out = await handlers.agent!(agentNode, 'rate this', ctx)
    expect(out).toEqual({ kind: 'ok', value: 'four stars' })
  })

  it('tool handler invokes AgentsKit tool end-to-end', async () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ tools: [echo] }),
      lookupAgent: () => agent,
    })
    const out = await handlers.tool!(toolNode, undefined, ctx)
    expect(out.kind).toBe('ok')
  })

  it('agent handler surfaces unknown agent as failed', async () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ llm }),
      lookupAgent: () => undefined,
    })
    const out = await handlers.agent!(agentNode, 'x', ctx)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') expect(out.error.code).toBe('agent.not_found')
  })

  it('tool handler surfaces unknown tool id as failed', async () => {
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ tools: [] }),
      lookupAgent: () => agent,
    })
    const out = await handlers.tool!(toolNode, undefined, ctx)
    expect(out.kind).toBe('failed')
  })

  it('forwards usage tokens through to LlmResult shape', async () => {
    let captured: unknown
    const captureLlm: AgentskitChatAdapter = {
      id: 'cap',
      chat: async () => {
        const r = {
          text: 'ok',
          finishReason: 'stop' as const,
          usage: { inputTokens: 7, outputTokens: 3, costUsd: 0.5 },
        }
        captured = r
        return r
      },
    }
    const handlers = buildLiveHandlers({
      adapters: createAgentskitRegistry({ llm: captureLlm }),
      lookupAgent: () => agent,
    })
    await handlers.agent!(agentNode, 'x', ctx)
    expect(captured).toBeDefined()
  })
})
