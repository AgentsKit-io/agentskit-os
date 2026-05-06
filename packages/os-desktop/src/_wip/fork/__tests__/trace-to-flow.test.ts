/**
 * trace-to-flow unit tests (M2 #178).
 *
 * Covers 10+ span shapes including parallel branches, missing attributes,
 * root-only, deeply nested, and disconnected orphan spans.
 */

import { describe, expect, it } from 'vitest'
import { traceToFlowDraft } from '../trace-to-flow'
import type { Span } from '../../screens/traces/use-traces'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpan(overrides: Partial<Span> & { spanId: string; kind: Span['kind'] }): Span {
  return {
    traceId: 'test-trace',
    spanId: overrides.spanId,
    kind: overrides.kind,
    name: overrides.name ?? `${overrides.kind}.started`,
    workspaceId: 'ws-test',
    startedAt: overrides.startedAt ?? '2026-01-01T00:00:00.000Z',
    endedAt: overrides.endedAt ?? '2026-01-01T00:00:01.000Z',
    durationMs: overrides.durationMs ?? 1000,
    status: overrides.status ?? 'ok',
    attributes: overrides.attributes ?? {},
    parentSpanId: overrides.parentSpanId,
  }
}

// ---------------------------------------------------------------------------
// Shape 1: empty
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — empty spans', () => {
  it('returns a valid empty draft', () => {
    const draft = traceToFlowDraft([])
    expect(draft.nodes).toHaveLength(0)
    expect(draft.edges).toHaveLength(0)
    expect(draft.name).toBe('empty fork')
  })
})

// ---------------------------------------------------------------------------
// Shape 2: single root span (flow kind)
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — single root span', () => {
  const root = makeSpan({
    spanId: 'root',
    kind: 'flow',
    attributes: { 'agentskitos.flow_id': 'my-flow' },
  })

  it('emits one node', () => {
    const draft = traceToFlowDraft([root])
    expect(draft.nodes).toHaveLength(1)
    expect(draft.nodes[0]?.id).toBe('root')
    expect(draft.nodes[0]?.kind).toBe('flow')
  })

  it('derives name from flow_id attribute', () => {
    const draft = traceToFlowDraft([root])
    expect(draft.name).toBe('my-flow fork')
  })

  it('emits no edges', () => {
    const draft = traceToFlowDraft([root])
    expect(draft.edges).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Shape 3: root + agent child
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — root + agent child', () => {
  const root = makeSpan({ spanId: 'root', kind: 'flow' })
  const agent = makeSpan({
    spanId: 'agent-1',
    kind: 'agent',
    parentSpanId: 'root',
    attributes: { 'agentskitos.agent_id': 'my-agent' },
  })

  it('emits two nodes', () => {
    const draft = traceToFlowDraft([root, agent])
    expect(draft.nodes).toHaveLength(2)
  })

  it('resolves agent id from attribute', () => {
    const draft = traceToFlowDraft([root, agent])
    const agentNode = draft.nodes.find((n) => n.id === 'agent-1')
    expect(agentNode?.agent).toBe('my-agent')
  })

  it('emits one edge root→agent', () => {
    const draft = traceToFlowDraft([root, agent])
    expect(draft.edges).toHaveLength(1)
    expect(draft.edges[0]).toEqual({ source: 'root', target: 'agent-1' })
  })
})

// ---------------------------------------------------------------------------
// Shape 4: root → agent → tool (depth 3)
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — 3-level depth', () => {
  const root = makeSpan({ spanId: 'r', kind: 'flow' })
  const agent = makeSpan({ spanId: 'a', kind: 'agent', parentSpanId: 'r' })
  const tool = makeSpan({
    spanId: 't',
    kind: 'tool',
    parentSpanId: 'a',
    attributes: { 'agentskitos.node_id': 'my-tool' },
  })

  it('emits 3 nodes and 2 edges', () => {
    const draft = traceToFlowDraft([root, agent, tool])
    expect(draft.nodes).toHaveLength(3)
    expect(draft.edges).toHaveLength(2)
  })

  it('resolves tool id from attribute', () => {
    const draft = traceToFlowDraft([root, agent, tool])
    const toolNode = draft.nodes.find((n) => n.id === 't')
    expect(toolNode?.tool).toBe('my-tool')
  })

  it('builds correct edge chain', () => {
    const draft = traceToFlowDraft([root, agent, tool])
    expect(draft.edges).toContainEqual({ source: 'r', target: 'a' })
    expect(draft.edges).toContainEqual({ source: 'a', target: 't' })
  })
})

// ---------------------------------------------------------------------------
// Shape 5: parallel branches (two children of same parent)
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — parallel branches', () => {
  const root = makeSpan({ spanId: 'root', kind: 'flow' })
  const branch1 = makeSpan({ spanId: 'b1', kind: 'agent', parentSpanId: 'root' })
  const branch2 = makeSpan({ spanId: 'b2', kind: 'agent', parentSpanId: 'root' })

  it('emits 3 nodes', () => {
    const draft = traceToFlowDraft([root, branch1, branch2])
    expect(draft.nodes).toHaveLength(3)
  })

  it('emits 2 fan-out edges from root', () => {
    const draft = traceToFlowDraft([root, branch1, branch2])
    expect(draft.edges).toHaveLength(2)
    expect(draft.edges).toContainEqual({ source: 'root', target: 'b1' })
    expect(draft.edges).toContainEqual({ source: 'root', target: 'b2' })
  })
})

// ---------------------------------------------------------------------------
// Shape 6: three-way parallel branch
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — three-way parallel branches', () => {
  const root = makeSpan({ spanId: 'root', kind: 'flow' })
  const c1 = makeSpan({ spanId: 'c1', kind: 'tool', parentSpanId: 'root' })
  const c2 = makeSpan({ spanId: 'c2', kind: 'tool', parentSpanId: 'root' })
  const c3 = makeSpan({ spanId: 'c3', kind: 'tool', parentSpanId: 'root' })

  it('emits 4 nodes and 3 edges', () => {
    const draft = traceToFlowDraft([root, c1, c2, c3])
    expect(draft.nodes).toHaveLength(4)
    expect(draft.edges).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Shape 7: disconnected orphan spans (no matching parent in the set)
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — orphan spans', () => {
  const orphan = makeSpan({
    spanId: 'orphan',
    kind: 'agent',
    parentSpanId: 'missing-parent', // parent not in list
  })

  it('includes orphan as node but emits no edge for its dangling parent', () => {
    const draft = traceToFlowDraft([orphan])
    expect(draft.nodes).toHaveLength(1)
    expect(draft.edges).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Shape 8: agent span without agentskitos.agent_id attribute
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — agent without attribute', () => {
  const root = makeSpan({ spanId: 'r', kind: 'flow' })
  const agent = makeSpan({ spanId: 'a', kind: 'agent', parentSpanId: 'r', attributes: {} })

  it('creates agent node with undefined agent field', () => {
    const draft = traceToFlowDraft([root, agent])
    const node = draft.nodes.find((n) => n.id === 'a')
    expect(node?.kind).toBe('agent')
    expect(node?.agent).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Shape 9: human span
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — human span', () => {
  const root = makeSpan({ spanId: 'r', kind: 'flow' })
  const human = makeSpan({ spanId: 'h', kind: 'human', parentSpanId: 'r' })

  it('maps human kind correctly', () => {
    const draft = traceToFlowDraft([root, human])
    const node = draft.nodes.find((n) => n.id === 'h')
    expect(node?.kind).toBe('human')
  })
})

// ---------------------------------------------------------------------------
// Shape 10: unknown span kind
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — unknown span kind', () => {
  const root = makeSpan({ spanId: 'r', kind: 'flow' })
  const unk = makeSpan({ spanId: 'u', kind: 'unknown', parentSpanId: 'r' })

  it('maps unknown kind to "unknown" node kind', () => {
    const draft = traceToFlowDraft([root, unk])
    const node = draft.nodes.find((n) => n.id === 'u')
    expect(node?.kind).toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// Shape 11: flow name fallback when no flow_id attribute
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — flow name fallback', () => {
  const root = makeSpan({ spanId: 'r', kind: 'flow' })

  it('falls back to traceId fork when no flow_id attribute', () => {
    const draft = traceToFlowDraft([root])
    expect(draft.name).toBe('test-trace fork')
  })
})

// ---------------------------------------------------------------------------
// Shape 12: mixed chain — root → agent → 2 parallel tools
// ---------------------------------------------------------------------------

describe('traceToFlowDraft — mixed chain with parallel tools', () => {
  const root = makeSpan({ spanId: 'root', kind: 'flow', attributes: { 'agentskitos.flow_id': 'pipeline' } })
  const agent = makeSpan({ spanId: 'agent', kind: 'agent', parentSpanId: 'root' })
  const tool1 = makeSpan({ spanId: 'tool1', kind: 'tool', parentSpanId: 'agent' })
  const tool2 = makeSpan({ spanId: 'tool2', kind: 'tool', parentSpanId: 'agent' })

  it('emits 4 nodes and 3 edges', () => {
    const draft = traceToFlowDraft([root, agent, tool1, tool2])
    expect(draft.nodes).toHaveLength(4)
    expect(draft.edges).toHaveLength(3)
  })

  it('uses flow_id in name', () => {
    const draft = traceToFlowDraft([root, agent, tool1, tool2])
    expect(draft.name).toBe('pipeline fork')
  })

  it('label defaults to span name', () => {
    const draft = traceToFlowDraft([root, agent, tool1, tool2])
    const rootNode = draft.nodes.find((n) => n.id === 'root')
    expect(rootNode?.label).toBe('flow.started')
  })
})
