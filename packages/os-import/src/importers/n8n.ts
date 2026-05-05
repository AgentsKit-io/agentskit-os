// n8n workflow JSON → AgentsKitOS ConfigRoot subset.
// Pure transformation. Walks nodes + connections, maps known types to
// FlowNode kinds. Unknown types become tool nodes with warnings.

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Importer, ImportResult, ImportWarning } from '../types.js'

type N8nNode = {
  id?: string
  name: string
  type: string
  parameters?: Record<string, unknown>
  position?: readonly [number, number]
}

type N8nConnections = Record<
  string,
  {
    main:
      | ReadonlyArray<ReadonlyArray<{ node: string; type: string | undefined; index: number | undefined }>>
      | undefined
  }
>

type N8nWorkflow = {
  name: string | undefined
  id: string | undefined
  nodes: readonly N8nNode[] | undefined
  connections: N8nConnections | undefined
}

const slugify = (input: string): string => {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.length > 0 ? s.slice(0, 64) : 'node'
}

const KNOWN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'n8n-nodes-base.agent',
  '@n8n/n8n-nodes-langchain.agent',
])

const KNOWN_HUMAN_TYPES: ReadonlySet<string> = new Set([
  'n8n-nodes-base.formTrigger',
  'n8n-nodes-base.respondToWebhook',
])

const isWorkflow = (v: unknown): v is N8nWorkflow =>
  typeof v === 'object' &&
  v !== null &&
  Array.isArray((v as { nodes?: unknown }).nodes)

const ensureUnique = (id: string, taken: Set<string>): string => {
  let candidate = id
  let i = 2
  while (taken.has(candidate)) {
    candidate = `${id}-${i}`
    i++
  }
  taken.add(candidate)
  return candidate
}

const modelNameForAgent = (params: Record<string, unknown>): string =>
  typeof params['model'] === 'string' ? params['model'] : 'gpt-4o'

const toolNameFor = (type: string): string => `n8n.${type.replace(/^.*?\.([^.]+)$/, '$1')}`.slice(0, 128)

const promptForHumanNode = (n: N8nNode): string => {
  if (typeof n.parameters?.['message'] === 'string') return n.parameters['message'] as string
  return `n8n trigger ${n.name} (review)`
}

const isKnownToolNamespace = (type: string): boolean => type.startsWith('n8n-nodes-base') || type.includes('langchain')

const buildN8nNodes = (args: {
  nodes: readonly N8nNode[]
  warnings: ImportWarning[]
}): {
  agents: ReturnType<typeof parseAgentConfig>[]
  flowNodes: Array<Record<string, unknown>>
  nameToId: Map<string, string>
} => {
  const { nodes, warnings } = args
  const takenNodeIds = new Set<string>()
  const takenAgentIds = new Set<string>()
  const nameToId = new Map<string, string>()
  const agents: ReturnType<typeof parseAgentConfig>[] = []
  const flowNodes: Array<Record<string, unknown>> = []

  for (const n of nodes) {
    const baseId = ensureUnique(slugify(n.name), takenNodeIds)
    nameToId.set(n.name, baseId)

    if (KNOWN_AGENT_TYPES.has(n.type)) {
      const agentId = ensureUnique(slugify(`${n.name}-agent`), takenAgentIds)
      try {
        const params = n.parameters ?? {}
        agents.push(parseAgentConfig({ id: agentId, name: n.name, model: { provider: 'openai', model: modelNameForAgent(params) } }))
      } catch (err) {
        warnings.push({
          code: 'lossy_conversion',
          path: ['nodes', n.name, 'agent'],
          message: `agent parse failed: ${(err as Error).message}`,
        })
      }
      flowNodes.push({ id: baseId, kind: 'agent', agent: agentId })
      continue
    }

    if (KNOWN_HUMAN_TYPES.has(n.type)) {
      flowNodes.push({ id: baseId, kind: 'human', prompt: promptForHumanNode(n) })
      continue
    }

    flowNodes.push({ id: baseId, kind: 'tool', tool: toolNameFor(n.type) })
    if (!isKnownToolNamespace(n.type)) {
      warnings.push({
        code: 'unknown_node_type',
        path: ['nodes', n.name],
        message: `unfamiliar n8n node type "${n.type}" — emitted as generic tool node`,
      })
    }
  }

  return { agents, flowNodes, nameToId }
}

const pickN8nEntryId = (args: { nodes: readonly N8nNode[]; flowNodes: Array<Record<string, unknown>>; nameToId: Map<string, string> }): string => {
  const { nodes, flowNodes, nameToId } = args
  const firstName = nodes[0]?.name
  let entryId = 'entry'
  if (firstName) {
    const mapped = nameToId.get(firstName)
    if (mapped) entryId = mapped
  }
  const firstNodeId = flowNodes[0]?.id as string | undefined
  if (entryId === 'entry' && firstNodeId) entryId = firstNodeId
  return entryId
}

const buildN8nEdges = (connections: N8nWorkflow['connections'] | undefined, nameToId: Map<string, string>): Array<{ from: string; to: string }> => {
  const edges: Array<{ from: string; to: string }> = []
  for (const [fromName, conn] of Object.entries(connections ?? {})) {
    const fromId = nameToId.get(fromName)
    if (!fromId) continue
    for (const branch of conn.main ?? []) {
      for (const c of branch) {
        const toId = nameToId.get(c.node)
        if (toId) edges.push({ from: fromId, to: toId })
      }
    }
  }
  return edges
}

export const n8nImporter: Importer = {
  source: 'n8n',
  displayName: 'n8n',
  detect: (input) =>
    isWorkflow(input) &&
    (input.nodes ?? []).some(
      (n) => typeof n.type === 'string' && n.type.includes('n8n-nodes'),
    ),
  parse: (input) => {
    const warnings: ImportWarning[] = []
    if (!isWorkflow(input)) {
      throw new Error('n8nImporter: input is not an n8n workflow object')
    }
    const wfName = input.name ?? 'imported-workflow'
    const workspaceId = slugify(input.id ?? wfName)
    const flowId = slugify(wfName)
    const built = buildN8nNodes({ nodes: input.nodes ?? [], warnings })
    const entryId = pickN8nEntryId({ nodes: input.nodes ?? [], flowNodes: built.flowNodes, nameToId: built.nameToId })
    const edges = buildN8nEdges(input.connections, built.nameToId)

    const flow = parseFlowConfig({
      id: flowId,
      name: wfName,
      entry: entryId,
      nodes: built.flowNodes as never,
      edges,
    })

    return {
      source: 'n8n',
      workspace: { id: workspaceId, name: wfName },
      agents: built.agents,
      flows: [flow],
      warnings,
    } satisfies ImportResult
  },
}
