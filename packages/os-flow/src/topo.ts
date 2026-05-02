// Pure topological sort + reachability analysis for FlowConfig.
// No I/O. Operates on already-validated FlowConfig from os-core.

import type { FlowConfig, FlowEdge, FlowNode } from '@agentskit/os-core'

export type EdgeOn = FlowEdge['on']

export type AdjacencyEntry = { to: string; on: EdgeOn }
export type Adjacency = ReadonlyMap<string, readonly AdjacencyEntry[]>

export const buildAdjacency = (edges: readonly FlowEdge[], nodeIds: readonly string[]): Adjacency => {
  const adj = new Map<string, AdjacencyEntry[]>()
  for (const id of nodeIds) adj.set(id, [])
  for (const e of edges) {
    const list = adj.get(e.from)
    if (list) list.push({ to: e.to, on: e.on })
  }
  return adj
}

export const reachableFrom = (entry: string, adj: Adjacency): ReadonlySet<string> => {
  const out = new Set<string>()
  const stack: string[] = [entry]
  while (stack.length > 0) {
    const u = stack.pop()!
    if (out.has(u)) continue
    out.add(u)
    for (const v of adj.get(u) ?? []) stack.push(v.to)
  }
  return out
}

export const findUnreachable = (flow: FlowConfig): readonly string[] => {
  const adj = buildAdjacency(flow.edges, flow.nodes.map((n) => n.id))
  const reachable = reachableFrom(flow.entry, adj)
  return flow.nodes.map((n) => n.id).filter((id) => !reachable.has(id))
}

// Kahn's algorithm — produces a deterministic topo order or signals cycle.
export const topoSort = (
  flow: FlowConfig,
): { ok: true; order: readonly string[] } | { ok: false; cycle: readonly string[] } => {
  const ids = flow.nodes.map((n) => n.id)
  const adj = buildAdjacency(flow.edges, ids)
  const indeg = new Map<string, number>()
  for (const id of ids) indeg.set(id, 0)
  for (const e of flow.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)

  const ready: string[] = []
  for (const id of ids) {
    if ((indeg.get(id) ?? 0) === 0) ready.push(id)
  }
  ready.sort()

  const order: string[] = []
  while (ready.length > 0) {
    const u = ready.shift()!
    order.push(u)
    for (const v of adj.get(u) ?? []) {
      const next = (indeg.get(v.to) ?? 0) - 1
      indeg.set(v.to, next)
      if (next === 0) ready.push(v.to)
    }
    ready.sort()
  }

  if (order.length !== ids.length) {
    const remaining = ids.filter((id) => (indeg.get(id) ?? 0) > 0)
    return { ok: false, cycle: remaining }
  }
  return { ok: true, order }
}

export type GraphIssue =
  | { code: 'duplicate_node_id'; id: string }
  | { code: 'edge_from_missing'; id: string }
  | { code: 'edge_to_missing'; id: string }
  | { code: 'entry_missing'; id: string }
  | { code: 'unreachable_node'; id: string }
  | { code: 'cycle'; ids: readonly string[] }

export const auditGraph = (flow: FlowConfig): readonly GraphIssue[] => {
  const issues: GraphIssue[] = []
  const idSet = new Set<string>()
  for (const n of flow.nodes) {
    if (idSet.has(n.id)) issues.push({ code: 'duplicate_node_id', id: n.id })
    idSet.add(n.id)
  }
  if (!idSet.has(flow.entry)) issues.push({ code: 'entry_missing', id: flow.entry })
  for (const e of flow.edges) {
    if (!idSet.has(e.from)) issues.push({ code: 'edge_from_missing', id: e.from })
    if (!idSet.has(e.to)) issues.push({ code: 'edge_to_missing', id: e.to })
  }
  if (issues.length > 0) return issues

  const sorted = topoSort(flow)
  if (!sorted.ok) {
    issues.push({ code: 'cycle', ids: sorted.cycle })
    return issues
  }

  for (const id of findUnreachable(flow)) {
    issues.push({ code: 'unreachable_node', id })
  }
  return issues
}

export const nodeKindOf = (flow: FlowConfig, id: string): FlowNode['kind'] | undefined => {
  const n = flow.nodes.find((x) => x.id === id)
  return n?.kind
}
