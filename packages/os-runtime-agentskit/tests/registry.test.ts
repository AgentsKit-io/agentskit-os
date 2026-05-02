import { describe, expect, it } from 'vitest'
import {
  createAgentskitRegistry,
  type AgentskitChatAdapter,
  type AgentskitMemoryStore,
  type AgentskitTool,
} from '../src/index.js'

const fakeLlm: AgentskitChatAdapter = {
  id: 'llm',
  chat: async () => ({ text: 'ok' }),
}

const fakeTool: AgentskitTool = {
  name: 'echo',
  execute: async (args) => ({ kind: 'ok', value: args }),
}

const fakeMemory: AgentskitMemoryStore = {
  id: 'mem',
  get: async () => undefined,
  set: async () => undefined,
}

describe('createAgentskitRegistry', () => {
  it('returns empty registry when no inputs', () => {
    const r = createAgentskitRegistry({})
    expect(r).toEqual({})
  })

  it('binds llm only', () => {
    const r = createAgentskitRegistry({ llm: fakeLlm })
    expect(r.llm?.id).toBe('agentskit:llm')
    expect(r.tool).toBeUndefined()
    expect(r.memory).toBeUndefined()
  })

  it('binds tool executor only', () => {
    const r = createAgentskitRegistry({ tools: [fakeTool] })
    expect(r.tool?.knows('echo')).toBe(true)
    expect(r.llm).toBeUndefined()
  })

  it('binds memory only', () => {
    const r = createAgentskitRegistry({ memory: fakeMemory })
    expect(r.memory?.id).toBe('mem')
  })

  it('composes all three', () => {
    const r = createAgentskitRegistry({
      llm: fakeLlm,
      tools: [fakeTool],
      memory: fakeMemory,
    })
    expect(r.llm).toBeDefined()
    expect(r.tool).toBeDefined()
    expect(r.memory).toBeDefined()
  })

  it('forwards options to each binding', () => {
    const r = createAgentskitRegistry({
      llm: fakeLlm,
      llmOptions: { id: 'custom-llm' },
      tools: [fakeTool],
      toolOptions: { idResolver: (t) => `ns:${t.name}` },
      memory: fakeMemory,
      memoryOptions: { id: 'custom-mem' },
    })
    expect(r.llm?.id).toBe('custom-llm')
    expect(r.tool?.knows('ns:echo')).toBe(true)
    expect(r.memory?.id).toBe('custom-mem')
  })

  it('omits empty tools array gracefully', () => {
    const r = createAgentskitRegistry({ tools: [] })
    expect(r.tool?.knows('anything')).toBe(false)
  })
})
