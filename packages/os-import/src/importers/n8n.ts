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

type N8nConnections = {
  [fromNodeName: string]: {
    main?: ReadonlyArray<ReadonlyArray<{ node: string; type?: string; index?: number }>>
  }
}

type N8nWorkflow = {
  name?: string
  id?: string
  nodes?: readonly N8nNode[]
  connections?: N8nConnections
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

    const takenNodeIds = new Set<string>()
    const takenAgentIds = new Set<string>()
    const nameToId = new Map<string, string>()
    const agents: ReturnType<typeof parseAgentConfig>[] = []
    const flowNodes: Array<Record<string, unknown>> = []

    for (const n of input.nodes ?? []) {
      const baseId = ensureUnique(slugify(n.name), takenNodeIds)
      nameToId.set(n.name, baseId)

      if (KNOWN_AGENT_TYPES.has(n.type)) {
        const agentId = ensureUnique(slugify(`${n.name}-agent`), takenAgentIds)
        try {
          const params = n.parameters ?? {}
          agents.push(
            parseAgentConfig({
              id: agentId,
              name: n.name,
              model: {
                provider: typeof params['model'] === 'object' ? 'openai' : 'openai',
                model:
                  typeof params['model'] === 'string'
                    ? params['model']
                    : 'gpt-4o',
              },
            }),
          )
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
        let prompt = `n8n trigger ${n.name} (review)`
        if (typeof n.parameters?.['message'] === 'string') {
          prompt = n.parameters['message'] as string
        }
        flowNodes.push({
          id: baseId,
          kind: 'human',
          prompt,
        })
        continue
      }

      // Default: treat as tool, encode original type as tool name suffix.
      flowNodes.push({
        id: baseId,
        kind: 'tool',
        tool: `n8n.${n.type.replace(/^.*?\.([^.]+)$/, '$1')}`.slice(0, 128),
      })

      if (!n.type.startsWith('n8n-nodes-base') && !n.type.includes('langchain')) {
        warnings.push({
          code: 'unknown_node_type',
          path: ['nodes', n.name],
          message: `unfamiliar n8n node type "${n.type}" — emitted as generic tool node`,
        })
      }
    }

    // First node = entry. n8n typically lists trigger first.
    const firstName = (input.nodes ?? [])[0]?.name
    let entryId = 'entry'
    if (firstName) {
      const mapped = nameToId.get(firstName)
      if (mapped) entryId = mapped
    }
    const firstNodeId = flowNodes[0]?.id as string | undefined
    if (entryId === 'entry' && firstNodeId) entryId = firstNodeId

    const edges: Array<{ from: string; to: string }> = []
    for (const [fromName, conn] of Object.entries(input.connections ?? {})) {
      const fromId = nameToId.get(fromName)
      if (!fromId) continue
      for (const branch of conn.main ?? []) {
        for (const c of branch) {
          const toId = nameToId.get(c.node)
          if (toId) edges.push({ from: fromId, to: toId })
        }
      }
    }

    const flow = parseFlowConfig({
      id: flowId,
      name: wfName,
      entry: entryId,
      nodes: flowNodes as never,
      edges,
    })

    return {
      source: 'n8n',
      workspace: { id: workspaceId, name: wfName },
      agents,
      flows: [flow],
      warnings,
    } satisfies ImportResult
  },
}
