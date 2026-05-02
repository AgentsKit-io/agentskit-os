import { describe, expect, it } from 'vitest'
import { langflowImporter } from '../src/index.js'

const sampleFlow = {
  id: 'flow_abc',
  name: 'PR Review Flow',
  description: 'Reviews pull requests',
  data: {
    nodes: [
      {
        id: 'ChatInput-1',
        type: 'genericNode',
        data: { type: 'ChatInput', display_name: 'Input' },
      },
      {
        id: 'OpenAI-1',
        type: 'genericNode',
        data: {
          type: 'OpenAIComponent',
          display_name: 'GPT Reviewer',
          node: {
            template: { model_name: { value: 'gpt-4o' } },
          },
        },
      },
      {
        id: 'AnthropicChat-1',
        type: 'genericNode',
        data: {
          type: 'AnthropicChatComponent',
          display_name: 'Claude',
          node: { template: { model: 'claude-opus-4-7' } },
        },
      },
      {
        id: 'WikipediaSearch-1',
        type: 'genericNode',
        data: { type: 'WikipediaSearch', display_name: 'Wiki' },
      },
      {
        id: 'ChatOutput-1',
        type: 'genericNode',
        data: { type: 'ChatOutput', display_name: 'Output' },
      },
    ],
    edges: [
      { source: 'ChatInput-1', target: 'OpenAI-1' },
      { source: 'OpenAI-1', target: 'WikipediaSearch-1' },
      { source: 'WikipediaSearch-1', target: 'AnthropicChat-1' },
      { source: 'AnthropicChat-1', target: 'ChatOutput-1' },
    ],
  },
}

describe('langflowImporter.detect', () => {
  it('matches Langflow flow shape', () => {
    expect(langflowImporter.detect(sampleFlow)).toBe(true)
  })

  it('matches flow_name variant', () => {
    expect(langflowImporter.detect({ flow_name: 'x', data: {} })).toBe(true)
  })

  it('rejects without data', () => {
    expect(langflowImporter.detect({ name: 'x' })).toBe(false)
  })

  it('rejects without name/flow_name', () => {
    expect(langflowImporter.detect({ data: {} })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(langflowImporter.detect(null)).toBe(false)
    expect(langflowImporter.detect('x')).toBe(false)
  })
})

describe('langflowImporter.parse', () => {
  it('translates 5-node flow', () => {
    const r = langflowImporter.parse(sampleFlow)
    expect(r.source).toBe('langflow')
    expect(r.workspace.id).toBe('flow-abc')
    expect(r.flows).toHaveLength(1)
    expect(r.flows[0]?.nodes).toHaveLength(5)
  })

  it('emits agent nodes for OpenAI + Anthropic components', () => {
    const r = langflowImporter.parse(sampleFlow)
    const agentNodes = r.flows[0]?.nodes.filter((n) => n.kind === 'agent') ?? []
    expect(agentNodes).toHaveLength(2)
    expect(r.agents).toHaveLength(2)
  })

  it('infers Anthropic provider from claude- model prefix', () => {
    const r = langflowImporter.parse(sampleFlow)
    const claude = r.agents.find((a) => a.name === 'Claude')
    expect(claude?.model.provider).toBe('anthropic')
    expect(claude?.model.model).toBe('claude-opus-4-7')
  })

  it('emits human nodes for ChatInput / ChatOutput', () => {
    const r = langflowImporter.parse(sampleFlow)
    const humanNodes = r.flows[0]?.nodes.filter((n) => n.kind === 'human') ?? []
    expect(humanNodes).toHaveLength(2)
  })

  it('emits tool nodes for search components', () => {
    const r = langflowImporter.parse(sampleFlow)
    const toolNodes = r.flows[0]?.nodes.filter((n) => n.kind === 'tool') ?? []
    expect(toolNodes.length).toBeGreaterThanOrEqual(1)
  })

  it('translates edges via id remap', () => {
    const r = langflowImporter.parse(sampleFlow)
    expect(r.flows[0]?.edges.length).toBe(4)
  })

  it('warns on unfamiliar component types', () => {
    const r = langflowImporter.parse({
      name: 'Strange',
      data: {
        nodes: [
          { id: 'ChatInput-1', data: { type: 'ChatInput', display_name: 'In' } },
          { id: 'X-1', data: { type: 'CustomMysteryComponent', display_name: 'X' } },
        ],
        edges: [],
      },
    })
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings[0]?.code).toBe('unknown_node_type')
  })

  it('throws on empty nodes', () => {
    expect(() =>
      langflowImporter.parse({ name: 'empty', data: { nodes: [], edges: [] } }),
    ).toThrow(/no nodes/)
  })

  it('throws on non-flow input', () => {
    expect(() => langflowImporter.parse({ foo: 'bar' })).toThrow()
  })

  it('handles flow_name fallback for naming', () => {
    const r = langflowImporter.parse({
      flow_name: 'My Flow',
      data: {
        nodes: [{ id: 'ChatInput-1', data: { type: 'ChatInput', display_name: 'In' } }],
        edges: [],
      },
    })
    expect(r.workspace.name).toBe('My Flow')
  })
})
