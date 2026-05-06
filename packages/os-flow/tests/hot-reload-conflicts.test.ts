import { describe, expect, it } from 'vitest'
import { parseFlowConfig, type FlowConfig } from '@agentskit/os-core'
import { detectHotReloadConflicts } from '../src/hot-reload-conflicts.js'

const flow = (overrides: Partial<FlowConfig> = {}): FlowConfig =>
  parseFlowConfig({
    id: 'flow-a',
    name: 'Flow A',
    description: 'fixture',
    entry: 'a',
    tags: [],
    nodes: [
      { id: 'a', kind: 'agent', agent: 'researcher' },
      { id: 'b', kind: 'tool', tool: 'tools.git.diff' },
      { id: 'c', kind: 'human', prompt: 'Approve?' },
    ],
    edges: [
      { from: 'a', to: 'b', on: 'success' },
      { from: 'b', to: 'c', on: 'success' },
    ],
    ...overrides,
  })

describe('detectHotReloadConflicts (#247)', () => {
  it('returns no conflicts for an unchanged flow', () => {
    const f = flow()
    const conflicts = detectHotReloadConflicts({
      running: f,
      next: f,
      snapshot: { completedNodeIds: ['a'], inFlightNodeId: 'b' },
    })
    expect(conflicts).toEqual([])
  })

  it('flags removal of a completed node', () => {
    const running = flow()
    const next = flow({
      nodes: running.nodes.filter((n) => n.id !== 'a'),
      entry: 'b',
      edges: running.edges.filter((e) => e.from !== 'a' && e.to !== 'a'),
    })
    const conflicts = detectHotReloadConflicts({
      running,
      next,
      snapshot: { completedNodeIds: ['a'] },
    })
    expect(conflicts.map((c) => c.kind)).toContain('node_removed_after_completion')
  })

  it('flags kind change on a completed node', () => {
    const running = flow()
    const next = flow({
      nodes: running.nodes.map((n) =>
        n.id === 'a' ? { id: 'a', kind: 'tool' as const, tool: 'tools.git.diff' } : n,
      ),
    })
    const conflicts = detectHotReloadConflicts({
      running,
      next,
      snapshot: { completedNodeIds: ['a'] },
    })
    const kinds = conflicts.map((c) => c.kind)
    expect(kinds).toContain('node_kind_changed')
  })

  it('flags in-flight node removed and config changed', () => {
    const running = flow()
    const removed = flow({
      nodes: running.nodes.filter((n) => n.id !== 'b'),
      edges: running.edges.filter((e) => e.from !== 'b' && e.to !== 'b'),
    })
    const removedConflicts = detectHotReloadConflicts({
      running,
      next: removed,
      snapshot: { inFlightNodeId: 'b' },
    })
    expect(removedConflicts.map((c) => c.kind)).toContain('inflight_node_removed')

    const changed = flow({
      nodes: running.nodes.map((n) =>
        n.id === 'b' ? { id: 'b', kind: 'tool' as const, tool: 'tools.shell.run' } : n,
      ),
    })
    const changedConflicts = detectHotReloadConflicts({
      running,
      next: changed,
      snapshot: { inFlightNodeId: 'b' },
    })
    expect(changedConflicts.map((c) => c.kind)).toContain('inflight_node_changed')
  })

  it('flags checkpointed edges that no longer exist', () => {
    const running = flow()
    const next = flow({
      edges: [{ from: 'a', to: 'b', on: 'success' }],
    })
    const conflicts = detectHotReloadConflicts({
      running,
      next,
      snapshot: {
        completedNodeIds: [],
        checkpointedEdgeIds: ['a->b:success', 'b->c:success'],
      },
    })
    const removed = conflicts.find((c) => c.kind === 'checkpoint_edge_removed')
    expect(removed && removed.kind === 'checkpoint_edge_removed' ? removed.edgeId : '').toBe('b->c:success')
  })
})
