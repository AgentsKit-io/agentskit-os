import { describe, expect, it } from 'vitest'
import { parseFlowConfig } from '@agentskit/os-core'
import { auditGraph, findUnreachable, topoSort } from '../src/topo.js'

const flow = (over: Partial<Parameters<typeof parseFlowConfig>[0]> = {}) =>
  parseFlowConfig({
    id: 'f',
    name: 'F',
    entry: 'a',
    nodes: [
      { id: 'a', kind: 'tool', tool: 't' },
      { id: 'b', kind: 'tool', tool: 't' },
      { id: 'c', kind: 'tool', tool: 't' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ],
    ...(over as object),
  })

describe('topoSort', () => {
  it('returns deterministic linear order', () => {
    const r = topoSort(flow())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.order).toEqual(['a', 'b', 'c'])
  })

  it('handles diamond', () => {
    const f = parseFlowConfig({
      id: 'f',
      name: 'F',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 't' },
        { id: 'b', kind: 'tool', tool: 't' },
        { id: 'c', kind: 'tool', tool: 't' },
        { id: 'd', kind: 'tool', tool: 't' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
      ],
    })
    const r = topoSort(f)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.order[0]).toBe('a')
      expect(r.order[3]).toBe('d')
    }
  })
})

describe('findUnreachable', () => {
  it('reports nodes not connected from entry', () => {
    const f = parseFlowConfig({
      id: 'f',
      name: 'F',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 't' },
        { id: 'orphan', kind: 'tool', tool: 't' },
      ],
      edges: [],
    })
    expect(findUnreachable(f)).toEqual(['orphan'])
  })

  it('returns empty when all reachable', () => {
    expect(findUnreachable(flow())).toEqual([])
  })
})

describe('auditGraph', () => {
  it('clean graph reports no issues', () => {
    expect(auditGraph(flow())).toEqual([])
  })

  it('reports unreachable orphan', () => {
    const f = parseFlowConfig({
      id: 'f',
      name: 'F',
      entry: 'a',
      nodes: [
        { id: 'a', kind: 'tool', tool: 't' },
        { id: 'orphan', kind: 'tool', tool: 't' },
      ],
      edges: [],
    })
    const issues = auditGraph(f)
    expect(issues.find((i) => i.code === 'unreachable_node')).toBeDefined()
  })
})
