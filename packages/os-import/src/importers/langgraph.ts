// LangGraph → AgentsKitOS ConfigRoot subset.
// LangGraph exports a JSON describing nodes (callable steps) and edges
// (with optional conditional routing). We map each node to either an
// agent or a tool node, edges to FlowEdges. Lossy: conditional routes
// become condition nodes with a string predicate placeholder.

import { parseFlowConfig } from '@agentskit/os-core'
import type { Importer, ImportResult, ImportWarning } from '../types.js'

type LgNode = {
  id?: string
  type?: string
  data?: {
    label?: string
    runnable?: { name?: string; provider?: string; model?: string; system?: string }
  }
}

type LgEdge = {
  source?: string
  target?: string
  conditional?: { predicate?: string; description?: string }
}

type LgGraph = {
  name?: string
  description?: string
  nodes?: readonly LgNode[]
  edges?: readonly LgEdge[]
  entry?: string
  exit?: readonly string[]
}

const slug = (s: string): string => {
  const out = s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return out.length > 0 ? out.slice(0, 64) : 'node'
}

const isLg = (v: unknown): v is LgGraph =>
  !!v && typeof v === 'object' && 'nodes' in (v as object) && 'edges' in (v as object)

export const langgraphImporter: Importer = {
  source: 'langgraph',
  displayName: 'LangGraph',
  detect: isLg,
  parse: (input: unknown): ImportResult => {
    const warnings: ImportWarning[] = []
    if (!isLg(input)) {
      throw new Error('os.import.langgraph_invalid')
    }

    const wsId = slug(input.name ?? 'langgraph-import')
    const flowId = slug(input.name ?? 'flow')

    const flowNodes = (input.nodes ?? []).map((n, i) => {
      const id = slug(n.id ?? `node-${i}`)
      const kind = (n.type ?? '').toLowerCase()
      if (kind === 'tool' || kind === 'function' || kind === 'function_node') {
        return { id, kind: 'tool' as const, tool: n.data?.runnable?.name ?? id }
      }
      if (kind === 'condition' || kind === 'conditional') {
        warnings.push({
          code: 'lossy_conversion',
          path: ['nodes', i],
          message: 'condition expression not preserved; replaced with placeholder',
        })
        return { id, kind: 'condition' as const, expression: 'true' }
      }
      const provider = n.data?.runnable?.provider ?? 'anthropic'
      const model = n.data?.runnable?.model ?? 'claude-sonnet-4-6'
      return {
        id,
        kind: 'agent' as const,
        agent: id,
        agentConfig: {
          id,
          model: { provider, name: model },
          system: n.data?.runnable?.system ?? '',
        },
      }
    })

    const flowEdges = (input.edges ?? []).map((e, i) => {
      if (e.conditional) {
        warnings.push({
          code: 'lossy_conversion',
          path: ['edges', i],
          message: 'conditional routing flattened to plain edge',
        })
      }
      return { from: slug(e.source ?? ''), to: slug(e.target ?? '') }
    })

    const entry = slug(input.entry ?? flowNodes[0]?.id ?? 'node-0')
    const flowWithoutAgents = parseFlowConfig({
      schemaVersion: 1,
      id: flowId,
      name: input.name ?? 'LangGraph flow',
      entry,
      nodes: flowNodes.map((n) => {
        if (n.kind === 'agent') return { id: n.id, kind: 'agent', agent: n.agent }
        if (n.kind === 'tool') return { id: n.id, kind: 'tool', tool: n.tool }
        return { id: n.id, kind: 'condition', expression: n.expression }
      }),
      edges: flowEdges,
    })

    return {
      source: 'langgraph',
      workspace: { id: wsId, name: input.name ?? 'LangGraph import' },
      agents: [],
      flows: [flowWithoutAgents],
      warnings,
    }
  },
}
