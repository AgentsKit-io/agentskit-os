// Per #98 — what-if flow simulator.
// Pure: replays a recorded run trace against a candidate FlowConfig and
// reports which nodes/edges would change, the projected cost delta, and a
// diff verdict. No side effects; no node execution — caller-supplied
// `nodeOutcomeProjector` returns each candidate node's projected outcome.

import type { FlowConfig, FlowEdge, FlowNode } from '@agentskit/os-core'

export type RecordedNodeStep = {
  readonly nodeId: string
  readonly status: 'ok' | 'partial' | 'fail' | 'timeout' | 'skipped'
  readonly costUsd?: number
  readonly tokens?: number
  readonly attributes?: Readonly<Record<string, unknown>>
}

export type RecordedRunTrace = {
  readonly runId: string
  readonly entry: string
  readonly steps: readonly RecordedNodeStep[]
}

export type SimulationStep = {
  readonly nodeId: string
  readonly previousStatus?: RecordedNodeStep['status']
  readonly projectedStatus: RecordedNodeStep['status']
  readonly previousCostUsd?: number
  readonly projectedCostUsd?: number
}

export type WhatIfReport = {
  readonly schemaVersion: '1.0'
  readonly runId: string
  readonly nodesAdded: readonly string[]
  readonly nodesRemoved: readonly string[]
  readonly edgesAdded: readonly string[]
  readonly edgesRemoved: readonly string[]
  readonly steps: readonly SimulationStep[]
  readonly totalPreviousCostUsd: number
  readonly totalProjectedCostUsd: number
  readonly costDeltaUsd: number
}

export type NodeOutcomeProjector = (
  node: FlowNode,
  recorded: RecordedNodeStep | undefined,
) => Pick<RecordedNodeStep, 'status' | 'costUsd' | 'tokens'>

const edgeKey = (e: Pick<FlowEdge, 'from' | 'to' | 'on'>): string => `${e.from}->${e.to}:${e.on}`

const setOf = <T>(items: readonly T[], key: (i: T) => string): Map<string, T> =>
  new Map(items.map((i) => [key(i), i]))

const sumCost = (steps: readonly { costUsd?: number }[]): number =>
  steps.reduce((n, s) => n + (s.costUsd ?? 0), 0)

/**
 * Simulate a candidate flow against a recorded run trace (#98). Returns a
 * structured report the UI / CLI renders directly.
 */
export const simulateWhatIf = (args: {
  readonly running: FlowConfig
  readonly candidate: FlowConfig
  readonly trace: RecordedRunTrace
  readonly project: NodeOutcomeProjector
}): WhatIfReport => {
  const { running, candidate, trace, project } = args
  const runningNodes = setOf(running.nodes, (n) => n.id)
  const candidateNodes = setOf(candidate.nodes, (n) => n.id)
  const runningEdges = setOf(running.edges, edgeKey)
  const candidateEdges = setOf(candidate.edges, edgeKey)

  const nodesAdded = [...candidateNodes.keys()].filter((id) => !runningNodes.has(id))
  const nodesRemoved = [...runningNodes.keys()].filter((id) => !candidateNodes.has(id))
  const edgesAdded = [...candidateEdges.keys()].filter((k) => !runningEdges.has(k))
  const edgesRemoved = [...runningEdges.keys()].filter((k) => !candidateEdges.has(k))

  const recordedById = new Map(trace.steps.map((s) => [s.nodeId, s]))
  const steps: SimulationStep[] = []
  let projectedTotal = 0
  for (const node of candidate.nodes) {
    const recorded = recordedById.get(node.id)
    const projected = project(node, recorded)
    if (projected.costUsd !== undefined) projectedTotal += projected.costUsd
    steps.push({
      nodeId: node.id,
      ...(recorded?.status !== undefined ? { previousStatus: recorded.status } : {}),
      projectedStatus: projected.status,
      ...(recorded?.costUsd !== undefined ? { previousCostUsd: recorded.costUsd } : {}),
      ...(projected.costUsd !== undefined ? { projectedCostUsd: projected.costUsd } : {}),
    })
  }

  const previousTotal = sumCost(trace.steps)

  return {
    schemaVersion: '1.0',
    runId: trace.runId,
    nodesAdded,
    nodesRemoved,
    edgesAdded,
    edgesRemoved,
    steps,
    totalPreviousCostUsd: previousTotal,
    totalProjectedCostUsd: projectedTotal,
    costDeltaUsd: projectedTotal - previousTotal,
  }
}
