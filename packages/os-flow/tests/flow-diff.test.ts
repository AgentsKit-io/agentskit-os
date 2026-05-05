import { describe, expect, it } from 'vitest'
import type { FlowConfig } from '@agentskit/os-core'
import { diffFlowSemantics, renderFlowDiffMarkdown } from '../src/flow-diff.js'

const baseFlow = (overrides: Partial<FlowConfig>): FlowConfig => ({
  id: 'flow-a',
  name: 'Flow A',
  tags: [],
  entry: 'n1',
  nodes: [
    { id: 'n1', kind: 'tool', tool: 'echo', input: { x: 1 } },
    { id: 'n2', kind: 'agent', agent: 'dev' },
  ],
  edges: [{ from: 'n1', to: 'n2', on: 'success' }],
  ...overrides,
})

describe('diffFlowSemantics', () => {
  it('detects node + edge adds/removes/mods', () => {
    const a = baseFlow({})
    const b = baseFlow({
      name: 'Flow B',
      nodes: [
        { id: 'n1', kind: 'tool', tool: 'echo', input: { x: 2 } }, // modified
        { id: 'n3', kind: 'human', prompt: 'approve', approvers: ['a'], quorum: 1 }, // added
      ],
      edges: [{ from: 'n1', to: 'n3', on: 'success' }], // removed old, added new
      entry: 'n1',
      tags: ['demo'],
    })

    const d = diffFlowSemantics(a, b)
    expect(d.entryChanged).toBe(false)
    expect(d.nodeChanges.some((c) => c.kind === 'removed' && c.node.id === 'n2')).toBe(true)
    expect(d.nodeChanges.some((c) => c.kind === 'added' && c.node.id === 'n3')).toBe(true)
    const mod = d.nodeChanges.find((c) => c.kind === 'modified' && c.nodeId === 'n1')
    expect(mod && mod.kind === 'modified' ? mod.changes.length : 0).toBeGreaterThan(0)
    expect(d.edgeChanges.some((c) => c.kind === 'removed')).toBe(true)
    expect(d.edgeChanges.some((c) => c.kind === 'added')).toBe(true)
    expect(d.tagChanges.some((t) => t.kind === 'added' && t.tag === 'demo')).toBe(true)
  })

  it('renders markdown summary', () => {
    const a = baseFlow({})
    const b = baseFlow({ nodes: [{ id: 'n1', kind: 'tool', tool: 'echo', input: { x: 2 } }], edges: [] })
    const md = renderFlowDiffMarkdown(diffFlowSemantics(a, b))
    expect(md).toContain('## Flow diff')
    expect(md).toContain('### Nodes')
    expect(md).toContain('### Edges')
  })
})

