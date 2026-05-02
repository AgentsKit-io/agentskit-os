import { describe, expect, it } from 'vitest'
import { detectImporter, importWorkflow, n8nImporter } from '../src/index.js'

const sampleWorkflow = {
  name: 'PR Review',
  id: 'wf_123',
  nodes: [
    {
      id: 'n1',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: { path: 'pr' },
    },
    {
      id: 'n2',
      name: 'GitHub Fetch',
      type: 'n8n-nodes-base.github',
      parameters: { resource: 'pullRequest' },
    },
    {
      id: 'n3',
      name: 'AI Reviewer',
      type: '@n8n/n8n-nodes-langchain.agent',
      parameters: { model: 'gpt-4o' },
    },
  ],
  connections: {
    Webhook: {
      main: [[{ node: 'GitHub Fetch' }]],
    },
    'GitHub Fetch': {
      main: [[{ node: 'AI Reviewer' }]],
    },
  },
}

describe('n8nImporter.detect', () => {
  it('matches n8n workflow shape', () => {
    expect(n8nImporter.detect(sampleWorkflow)).toBe(true)
  })

  it('rejects non-objects', () => {
    expect(n8nImporter.detect('string')).toBe(false)
    expect(n8nImporter.detect(null)).toBe(false)
    expect(n8nImporter.detect(42)).toBe(false)
  })

  it('rejects unrelated JSON', () => {
    expect(n8nImporter.detect({ foo: 'bar' })).toBe(false)
  })
})

describe('n8nImporter.parse', () => {
  it('translates a 3-node workflow', () => {
    const r = n8nImporter.parse(sampleWorkflow)
    expect(r.source).toBe('n8n')
    expect(r.workspace.id).toBe('wf-123')
    expect(r.workspace.name).toBe('PR Review')
    expect(r.flows).toHaveLength(1)
    expect(r.flows[0]?.nodes).toHaveLength(3)
  })

  it('emits agent node for langchain agent type', () => {
    const r = n8nImporter.parse(sampleWorkflow)
    const agentNode = r.flows[0]?.nodes.find((n) => n.kind === 'agent')
    expect(agentNode).toBeDefined()
    expect(r.agents).toHaveLength(1)
  })

  it('emits tool nodes for known builtins', () => {
    const r = n8nImporter.parse(sampleWorkflow)
    const toolNodes = r.flows[0]?.nodes.filter((n) => n.kind === 'tool') ?? []
    expect(toolNodes.length).toBe(2)
  })

  it('translates connections to edges', () => {
    const r = n8nImporter.parse(sampleWorkflow)
    expect(r.flows[0]?.edges).toHaveLength(2)
    expect(r.flows[0]?.edges[0]?.from).toBe('webhook')
  })

  it('warns on unknown node types', () => {
    const r = n8nImporter.parse({
      ...sampleWorkflow,
      nodes: [
        { name: 'Mystery', type: 'custom-vendor.mystery' },
      ],
      connections: {},
    })
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings[0]?.code).toBe('unknown_node_type')
  })

  it('uses first node as entry by default', () => {
    const r = n8nImporter.parse(sampleWorkflow)
    expect(r.flows[0]?.entry).toBe('webhook')
  })

  it('throws on non-workflow input', () => {
    expect(() => n8nImporter.parse({ foo: 'bar' })).toThrow()
  })
})

describe('detectImporter / importWorkflow', () => {
  it('detects n8n via registry', () => {
    const importer = detectImporter(sampleWorkflow)
    expect(importer?.source).toBe('n8n')
  })

  it('importWorkflow runs the detected importer', () => {
    const r = importWorkflow(sampleWorkflow)
    expect(r.source).toBe('n8n')
  })

  it('throws when no importer matches', () => {
    expect(() => importWorkflow({ totally: 'unrelated' })).toThrow(/no importer matched/)
  })
})
