import { describe, expect, it } from 'vitest'
import { langgraphImporter } from '../src/importers/langgraph.js'

describe('langgraphImporter', () => {
  const sample = {
    name: 'My LangGraph Flow',
    nodes: [
      { id: 'n1', type: 'llm', data: { runnable: { provider: 'anthropic', model: 'claude-sonnet-4-6' } } },
      { id: 'n2', type: 'tool', data: { runnable: { name: 'search' } } },
      { id: 'n3', type: 'condition' },
    ],
    edges: [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3', conditional: { predicate: 'len > 0' } },
    ],
  }

  it('detects LangGraph shape', () => {
    expect(langgraphImporter.detect(sample)).toBe(true)
    expect(langgraphImporter.detect({ foo: 'bar' })).toBe(false)
  })

  it('parses to FlowConfig with one flow', () => {
    const r = langgraphImporter.parse(sample)
    expect(r.flows).toHaveLength(1)
    expect(r.flows[0]?.nodes).toHaveLength(3)
    const kinds = r.flows[0]!.nodes.map((n) => n.kind)
    expect(kinds).toContain('agent')
    expect(kinds).toContain('tool')
    expect(kinds).toContain('condition')
  })

  it('emits lossy_conversion warning for conditional edge', () => {
    const r = langgraphImporter.parse(sample)
    expect(r.warnings.some((w) => w.code === 'lossy_conversion')).toBe(true)
  })

  it('maps workspace name from graph name', () => {
    const r = langgraphImporter.parse(sample)
    expect(r.workspace.name).toBe('My LangGraph Flow')
  })
})
