import { describe, expect, it } from 'vitest'
import { difyImporter } from '../src/index.js'

const sampleWorkflow = {
  app: { name: 'Customer Support', mode: 'workflow', description: 'CS bot' },
  workflow: {
    graph: {
      nodes: [
        { id: 'n1', data: { type: 'start', title: 'Start' } },
        {
          id: 'n2',
          data: {
            type: 'llm',
            title: 'Classifier',
            model: { provider: 'anthropic', name: 'claude-opus-4-7' },
          },
        },
        { id: 'n3', data: { type: 'if-else', title: 'Route' } },
        { id: 'n4', data: { type: 'knowledge-retrieval', title: 'KB' } },
        { id: 'n5', data: { type: 'http-request', title: 'CRM Lookup' } },
        { id: 'n6', data: { type: 'end', title: 'End' } },
      ],
      edges: [
        { source: 'n1', target: 'n2' },
        { source: 'n2', target: 'n3' },
        { source: 'n3', target: 'n4' },
        { source: 'n3', target: 'n5' },
        { source: 'n4', target: 'n6' },
        { source: 'n5', target: 'n6' },
      ],
    },
  },
}

describe('difyImporter.detect', () => {
  it('matches Dify workflow shape', () => {
    expect(difyImporter.detect(sampleWorkflow)).toBe(true)
  })

  it('rejects without app', () => {
    expect(difyImporter.detect({ workflow: {} })).toBe(false)
  })

  it('rejects without workflow', () => {
    expect(difyImporter.detect({ app: {} })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(difyImporter.detect(null)).toBe(false)
    expect(difyImporter.detect('x')).toBe(false)
  })
})

describe('difyImporter.parse', () => {
  it('translates 6-node workflow', () => {
    const r = difyImporter.parse(sampleWorkflow)
    expect(r.source).toBe('dify')
    expect(r.workspace.name).toBe('Customer Support')
    expect(r.flows).toHaveLength(1)
    expect(r.flows[0]?.nodes).toHaveLength(6)
  })

  it('emits agent for llm with normalized anthropic provider', () => {
    const r = difyImporter.parse(sampleWorkflow)
    expect(r.agents).toHaveLength(1)
    expect(r.agents[0]?.model.provider).toBe('anthropic')
    expect(r.agents[0]?.model.model).toBe('claude-opus-4-7')
  })

  it('emits human for start + end nodes', () => {
    const r = difyImporter.parse(sampleWorkflow)
    const human = r.flows[0]?.nodes.filter((n) => n.kind === 'human') ?? []
    expect(human).toHaveLength(2)
  })

  it('emits condition for if-else with warning', () => {
    const r = difyImporter.parse(sampleWorkflow)
    const cond = r.flows[0]?.nodes.find((n) => n.kind === 'condition')
    expect(cond).toBeDefined()
    expect(r.warnings.some((w) => w.code === 'lossy_conversion' && w.message.includes('if-else'))).toBe(true)
  })

  it('emits tools for knowledge-retrieval + http-request', () => {
    const r = difyImporter.parse(sampleWorkflow)
    const tools = r.flows[0]?.nodes.filter((n) => n.kind === 'tool') ?? []
    expect(tools).toHaveLength(2)
  })

  it('uses start node as entry', () => {
    const r = difyImporter.parse(sampleWorkflow)
    expect(r.flows[0]?.entry).toBe('start')
  })

  it('translates edges', () => {
    const r = difyImporter.parse(sampleWorkflow)
    expect(r.flows[0]?.edges).toHaveLength(6)
  })

  it('warns on unknown node type', () => {
    const r = difyImporter.parse({
      app: { name: 'Test' },
      workflow: {
        graph: {
          nodes: [
            { id: 'n1', data: { type: 'start', title: 'Start' } },
            { id: 'n2', data: { type: 'mystery-vendor-thing', title: 'X' } },
          ],
          edges: [],
        },
      },
    })
    expect(r.warnings.some((w) => w.code === 'unknown_node_type')).toBe(true)
  })

  it('normalizes azure_openai → openai provider', () => {
    const r = difyImporter.parse({
      app: { name: 'Azure Bot' },
      workflow: {
        graph: {
          nodes: [
            { id: 's', data: { type: 'start', title: 'Start' } },
            {
              id: 'l',
              data: {
                type: 'llm',
                title: 'AzureGPT',
                model: { provider: 'azure_openai', name: 'gpt-4o' },
              },
            },
          ],
          edges: [],
        },
      },
    })
    expect(r.agents[0]?.model.provider).toBe('openai')
  })

  it('throws on empty graph', () => {
    expect(() =>
      difyImporter.parse({
        app: { name: 'x' },
        workflow: { graph: { nodes: [], edges: [] } },
      }),
    ).toThrow(/no nodes/)
  })

  it('throws on non-workflow input', () => {
    expect(() => difyImporter.parse({ foo: 'bar' })).toThrow()
  })
})
