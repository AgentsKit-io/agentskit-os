// Per #93 — multi-agent topology presets.
// Pure builder: turns an agent list + a topology name into FlowEdge[] the
// runtime feeds into the standard FlowConfig. UI layout is left to the
// visual editor (#174).

import type { FlowEdge } from '../schema/flow.js'

export type Topology = 'star' | 'ring' | 'mesh' | 'pipeline'

export const TOPOLOGY_IDS: readonly Topology[] = ['star', 'ring', 'mesh', 'pipeline']

const buildStar = (agents: readonly string[]): readonly FlowEdge[] => {
  if (agents.length < 2) return []
  const [hub, ...spokes] = agents
  if (hub === undefined) return []
  return spokes.flatMap((spoke) => [
    { from: hub, to: spoke, on: 'always' as const },
    { from: spoke, to: hub, on: 'success' as const },
  ])
}

const buildRing = (agents: readonly string[]): readonly FlowEdge[] => {
  if (agents.length < 2) return []
  const edges: FlowEdge[] = []
  for (let i = 0; i < agents.length; i += 1) {
    const from = agents[i]!
    const to = agents[(i + 1) % agents.length]!
    edges.push({ from, to, on: 'success' })
  }
  return edges
}

const buildMesh = (agents: readonly string[]): readonly FlowEdge[] => {
  const edges: FlowEdge[] = []
  for (let i = 0; i < agents.length; i += 1) {
    for (let j = 0; j < agents.length; j += 1) {
      if (i === j) continue
      edges.push({ from: agents[i]!, to: agents[j]!, on: 'success' })
    }
  }
  return edges
}

const buildPipeline = (agents: readonly string[]): readonly FlowEdge[] => {
  if (agents.length < 2) return []
  const edges: FlowEdge[] = []
  for (let i = 0; i < agents.length - 1; i += 1) {
    edges.push({ from: agents[i]!, to: agents[i + 1]!, on: 'success' })
  }
  return edges
}

const BUILDERS: Readonly<Record<Topology, (agents: readonly string[]) => readonly FlowEdge[]>> = {
  star: buildStar,
  ring: buildRing,
  mesh: buildMesh,
  pipeline: buildPipeline,
}

export type TopologyPlan = {
  readonly topology: Topology
  readonly nodeIds: readonly string[]
  readonly edges: readonly FlowEdge[]
  readonly entry: string
}

/**
 * Build edges for a multi-agent topology (#93). Pure: caller passes the
 * ordered agent ids; first id is treated as the entry node.
 */
export const buildTopologyPlan = (topology: Topology, agents: readonly string[]): TopologyPlan => {
  if (agents.length === 0) throw new Error('topology requires at least one agent')
  const builder = BUILDERS[topology]
  return {
    topology,
    nodeIds: [...agents],
    edges: builder(agents),
    entry: agents[0]!,
  }
}
