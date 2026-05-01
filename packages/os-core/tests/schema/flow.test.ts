import { describe, expect, it } from 'vitest'
import { parseFlowConfig, safeParseFlowConfig } from '../../src/schema/flow.js'

const valid = {
  id: 'pr-review',
  name: 'PR Review',
  entry: 'fetch',
  nodes: [
    { id: 'fetch', kind: 'agent', agent: 'fetcher' },
    { id: 'review', kind: 'agent', agent: 'reviewer' },
    { id: 'approve', kind: 'human', prompt: 'Merge?' },
  ],
  edges: [
    { from: 'fetch', to: 'review' },
    { from: 'review', to: 'approve' },
  ],
}

describe('FlowConfig schema', () => {
  describe('parse — accept', () => {
    it('parses a valid linear flow', () => {
      const f = parseFlowConfig(valid)
      expect(f.entry).toBe('fetch')
      expect(f.nodes).toHaveLength(3)
    })

    it('parses each node kind', () => {
      const f = parseFlowConfig({
        id: 'all-kinds',
        name: 'All',
        entry: 'a',
        nodes: [
          { id: 'a', kind: 'agent', agent: 'x' },
          { id: 'b', kind: 'tool', tool: 'web-search' },
          { id: 'c', kind: 'human', prompt: 'ok?' },
          { id: 'd', kind: 'condition', expression: 'score > 0.8' },
          { id: 'e', kind: 'parallel', branches: ['a', 'b'] },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'd' },
          { from: 'd', to: 'e' },
        ],
      })
      expect(f.nodes.map((n) => n.kind)).toEqual([
        'agent',
        'tool',
        'human',
        'condition',
        'parallel',
      ])
    })

    it('parses with retry policy', () => {
      const f = parseFlowConfig({
        ...valid,
        nodes: [
          { id: 'fetch', kind: 'agent', agent: 'x', retry: { maxAttempts: 5 } },
          ...valid.nodes.slice(1),
        ],
      })
      const first = f.nodes[0]
      expect(first?.kind === 'agent' && first.retry?.maxAttempts).toBe(5)
    })
  })

  describe('parse — reject', () => {
    it('rejects entry not in nodes', () => {
      const r = safeParseFlowConfig({ ...valid, entry: 'nonexistent' })
      expect(r.success).toBe(false)
    })

    it('rejects duplicate node ids', () => {
      const r = safeParseFlowConfig({
        ...valid,
        nodes: [
          { id: 'fetch', kind: 'agent', agent: 'a' },
          { id: 'fetch', kind: 'agent', agent: 'b' },
        ],
        edges: [],
      })
      expect(r.success).toBe(false)
    })

    it('rejects edge referencing missing node', () => {
      const r = safeParseFlowConfig({
        ...valid,
        edges: [{ from: 'fetch', to: 'ghost' }],
      })
      expect(r.success).toBe(false)
    })

    it('rejects cyclic graph', () => {
      const r = safeParseFlowConfig({
        ...valid,
        edges: [
          { from: 'fetch', to: 'review' },
          { from: 'review', to: 'approve' },
          { from: 'approve', to: 'fetch' },
        ],
      })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0]?.message).toContain('cycle')
    })

    it('rejects empty nodes array', () => {
      const r = safeParseFlowConfig({ ...valid, nodes: [] })
      expect(r.success).toBe(false)
    })

    it('rejects parallel node with single branch', () => {
      const r = safeParseFlowConfig({
        id: 'p',
        name: 'P',
        entry: 'p',
        nodes: [{ id: 'p', kind: 'parallel', branches: ['a'] }],
        edges: [],
      })
      expect(r.success).toBe(false)
    })

    it('rejects unknown node kind', () => {
      const r = safeParseFlowConfig({
        ...valid,
        nodes: [{ id: 'x', kind: 'magic' }],
      })
      expect(r.success).toBe(false)
    })

    it('rejects retry maxAttempts > 20', () => {
      const r = safeParseFlowConfig({
        ...valid,
        nodes: [
          { id: 'fetch', kind: 'agent', agent: 'a', retry: { maxAttempts: 21 } },
          ...valid.nodes.slice(1),
        ],
      })
      expect(r.success).toBe(false)
    })

    it('throws on parseFlowConfig with invalid input', () => {
      expect(() => parseFlowConfig({})).toThrow()
    })
  })
})
