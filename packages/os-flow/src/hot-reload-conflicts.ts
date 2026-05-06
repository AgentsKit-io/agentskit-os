// Per #247 — hot-reload conflict detector.
// Pure: caller passes the running snapshot (which nodes have already executed
// + which is currently in-flight) plus the diff between the live flow and a
// hot-reloaded version. The detector emits one conflict per node/edge that
// the running snapshot makes unsafe to swap.

import type { FlowConfig, FlowEdge, FlowNode } from '@agentskit/os-core'

export type HotReloadRunSnapshot = {
  /** Nodes that already produced an output and won't re-execute. */
  readonly completedNodeIds?: readonly string[]
  /** Node currently executing (cannot be swapped without abort). */
  readonly inFlightNodeId?: string
  /** Optional checkpointed branch values keyed by edge id (`from->to:on`). */
  readonly checkpointedEdgeIds?: readonly string[]
}

export type HotReloadConflict =
  | { readonly kind: 'node_removed_after_completion'; readonly nodeId: string; readonly detail: string }
  | { readonly kind: 'node_kind_changed'; readonly nodeId: string; readonly from: string; readonly to: string }
  | { readonly kind: 'inflight_node_changed'; readonly nodeId: string; readonly detail: string }
  | { readonly kind: 'inflight_node_removed'; readonly nodeId: string }
  | { readonly kind: 'checkpoint_edge_removed'; readonly edgeId: string }

const edgeId = (e: Pick<FlowEdge, 'from' | 'to' | 'on'>): string => `${e.from}->${e.to}:${e.on}`

const indexById = <T extends { id: string }>(items: readonly T[]): Map<string, T> =>
  new Map(items.map((i) => [i.id, i]))

const nodeShape = (n: FlowNode): string => JSON.stringify(n)

/**
 * Detect every conflict between the in-flight run snapshot and the
 * hot-reloaded flow definition (#247). Returns an empty array when the swap
 * is safe.
 */
export const detectHotReloadConflicts = (args: {
  readonly running: FlowConfig
  readonly next: FlowConfig
  readonly snapshot: HotReloadRunSnapshot
}): readonly HotReloadConflict[] => {
  const { running, next, snapshot } = args
  const conflicts: HotReloadConflict[] = []
  const runningById = indexById(running.nodes)
  const nextById = indexById(next.nodes)

  for (const completedId of snapshot.completedNodeIds ?? []) {
    const before = runningById.get(completedId)
    const after = nextById.get(completedId)
    if (before === undefined) continue
    if (after === undefined) {
      conflicts.push({
        kind: 'node_removed_after_completion',
        nodeId: completedId,
        detail: 'completed node was deleted in the new flow; downstream re-run cannot reproduce its output',
      })
      continue
    }
    if (after.kind !== before.kind) {
      conflicts.push({
        kind: 'node_kind_changed',
        nodeId: completedId,
        from: before.kind,
        to: after.kind,
      })
    }
  }

  if (snapshot.inFlightNodeId !== undefined) {
    const id = snapshot.inFlightNodeId
    const before = runningById.get(id)
    const after = nextById.get(id)
    if (after === undefined) {
      conflicts.push({ kind: 'inflight_node_removed', nodeId: id })
    } else if (before !== undefined && nodeShape(before) !== nodeShape(after)) {
      conflicts.push({
        kind: 'inflight_node_changed',
        nodeId: id,
        detail: 'in-flight node config changed; abort and restart from the last checkpoint to apply',
      })
    }
  }

  if (snapshot.checkpointedEdgeIds !== undefined) {
    const nextEdgeIds = new Set(next.edges.map(edgeId))
    for (const e of snapshot.checkpointedEdgeIds) {
      if (!nextEdgeIds.has(e)) {
        conflicts.push({ kind: 'checkpoint_edge_removed', edgeId: e })
      }
    }
  }

  return conflicts
}
