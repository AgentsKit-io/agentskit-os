// Dify DSL → AgentsKitOS ConfigRoot subset.
// Pure transformation. Walks workflow.graph.nodes + edges.

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Importer, ImportResult, ImportWarning } from '../types.js'

type DifyNode = {
  id: string
  data:
    | {
        type: string | undefined
        title: string | undefined
        desc: string | undefined
        model:
          | {
              provider: string | undefined
              name: string | undefined
              mode: string | undefined
            }
          | undefined
        prompt_template: ReadonlyArray<{ role: string | undefined; text: string | undefined }> | undefined
        inputs: Record<string, unknown> | undefined
      }
    | undefined
}

type DifyEdge = {
  id: string | undefined
  source: string
  target: string
  sourceHandle: string | undefined
  targetHandle: string | undefined
}

type DifyWorkflow = {
  app:
    | {
        name: string | undefined
        mode: string | undefined
        description: string | undefined
      }
    | undefined
  workflow:
    | {
        graph:
          | {
              nodes: readonly DifyNode[] | undefined
              edges: readonly DifyEdge[] | undefined
            }
          | undefined
        features: Record<string, unknown> | undefined
      }
    | undefined
}

const slugify = (input: string): string => {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.length > 0 ? s.slice(0, 64) : 'node'
}

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

const isWorkflow = (v: unknown): v is DifyWorkflow => {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return obj['app'] !== undefined && obj['workflow'] !== undefined
}

const TYPE_MAP: Record<string, 'agent' | 'tool' | 'human' | 'condition' | 'unknown'> = {
  start: 'human',
  end: 'human',
  answer: 'human',
  llm: 'agent',
  agent: 'agent',
  'knowledge-retrieval': 'tool',
  tool: 'tool',
  'http-request': 'tool',
  code: 'tool',
  'template-transform': 'tool',
  'variable-aggregator': 'tool',
  'parameter-extractor': 'tool',
  'document-extractor': 'tool',
  iteration: 'tool',
  loop: 'tool',
  'if-else': 'condition',
  'question-classifier': 'condition',
}

const inferKind = (type: string): 'agent' | 'tool' | 'human' | 'condition' | 'unknown' => {
  const hit = TYPE_MAP[type]
  if (hit) return hit
  return 'unknown'
}

const NORMALIZE_PROVIDER: Record<string, string> = {
  openai: 'openai',
  azure_openai: 'openai',
  anthropic: 'anthropic',
  google: 'gemini',
  vertex_ai: 'gemini',
  cohere: 'cohere',
  mistral: 'mistral',
  groq: 'groq',
  ollama: 'ollama',
  bedrock: 'anthropic',
}

const getDifyModel = (n: DifyNode): { provider: string; model: string } => {
  let rawProvider = ''
  if (n.data !== undefined && n.data.model !== undefined && n.data.model.provider !== undefined) {
    rawProvider = n.data.model.provider
  }
  let provider = 'openai'
  if (rawProvider) {
    const mapped = NORMALIZE_PROVIDER[rawProvider]
    if (mapped) provider = mapped
  }

  let model = 'gpt-4o'
  if (n.data !== undefined && n.data.model !== undefined && n.data.model.name !== undefined) {
    model = n.data.model.name
  }
  return { provider, model }
}

const buildDifyNodes = (args: {
  nodes: readonly DifyNode[]
  warnings: ImportWarning[]
}): {
  agents: ReturnType<typeof parseAgentConfig>[]
  flowNodes: Array<Record<string, unknown>>
  idMap: Map<string, string>
} => {
  const { nodes, warnings } = args
  const takenNodeIds = new Set<string>()
  const takenAgentIds = new Set<string>()
  const idMap = new Map<string, string>()
  const agents: ReturnType<typeof parseAgentConfig>[] = []
  const flowNodes: Array<Record<string, unknown>> = []

  for (const n of nodes) {
    const componentType = n.data?.type ?? 'unknown'
    const title = n.data?.title ?? componentType
    const kind = inferKind(componentType)
    const baseId = ensureUnique(slugify(title || componentType), takenNodeIds)
    idMap.set(n.id, baseId)

    if (kind === 'agent') {
      const agentId = ensureUnique(slugify(`${title}-agent`), takenAgentIds)
      const model = getDifyModel(n)
      try {
        agents.push(parseAgentConfig({ id: agentId, name: title, model }))
      } catch (err) {
        warnings.push({
          code: 'lossy_conversion',
          path: ['nodes', n.id, 'agent'],
          message: `agent parse failed: ${(err as Error).message}`,
        })
      }
      flowNodes.push({ id: baseId, kind: 'agent', agent: agentId })
      continue
    }

    if (kind === 'human') {
      flowNodes.push({ id: baseId, kind: 'human', prompt: `Dify ${componentType}: ${title}` })
      continue
    }

    if (kind === 'condition') {
      flowNodes.push({ id: baseId, kind: 'condition', expression: 'true' })
      warnings.push({
        code: 'lossy_conversion',
        path: ['nodes', n.id, 'expression'],
        message: `Dify "${componentType}" condition stubbed to "true" — manual edit required`,
      })
      continue
    }

    if (kind === 'tool') {
      flowNodes.push({ id: baseId, kind: 'tool', tool: `dify.${slugify(componentType)}`.slice(0, 128) })
      continue
    }

    flowNodes.push({ id: baseId, kind: 'tool', tool: 'dify.unknown' })
    warnings.push({
      code: 'unknown_node_type',
      path: ['nodes', n.id],
      message: `unfamiliar Dify node type "${componentType}" — emitted as generic tool`,
    })
  }

  return { agents, flowNodes, idMap }
}

const buildDifyEdges = (edges: readonly DifyEdge[], idMap: Map<string, string>): Array<{ from: string; to: string }> => {
  const flowEdges: Array<{ from: string; to: string }> = []
  for (const e of edges) {
    const from = idMap.get(e.source)
    const to = idMap.get(e.target)
    if (from && to) flowEdges.push({ from, to })
  }
  return flowEdges
}

const pickDifyEntryId = (args: {
  nodes: readonly DifyNode[]
  flowNodes: Array<Record<string, unknown>>
  idMap: Map<string, string>
}): string => {
  const { nodes, flowNodes, idMap } = args
  const startEntry = nodes.find((n) => n.data?.type === 'start')
  let entryId = 'entry'
  if (startEntry) {
    const mapped = idMap.get(startEntry.id)
    if (mapped) entryId = mapped
  }
  const first = flowNodes[0]?.id as string | undefined
  if (entryId === 'entry' && first) entryId = first
  return entryId
}

export const difyImporter: Importer = {
  source: 'dify',
  displayName: 'Dify',
  detect: isWorkflow,
  parse: (input) => {
    if (!isWorkflow(input)) {
      throw new Error('difyImporter: input is not a Dify workflow')
    }

    const warnings: ImportWarning[] = []
    const appName = input.app?.name ?? 'imported-dify'
    const workspaceId = slugify(appName)
    const flowId = slugify(`${appName}-flow`)

    const nodes = input.workflow?.graph?.nodes ?? []
    const edges = input.workflow?.graph?.edges ?? []

    if (nodes.length === 0) {
      throw new Error('difyImporter: workflow has no nodes')
    }

    const built = buildDifyNodes({ nodes, warnings })
    const flowEdges = buildDifyEdges(edges, built.idMap)
    const entryId = pickDifyEntryId({ nodes, flowNodes: built.flowNodes, idMap: built.idMap })

    const flow = parseFlowConfig({
      id: flowId,
      name: appName,
      entry: entryId,
      nodes: built.flowNodes as never,
      edges: flowEdges,
    })

    return {
      source: 'dify',
      workspace: { id: workspaceId, name: appName },
      agents: built.agents,
      flows: [flow],
      warnings,
    } satisfies ImportResult
  },
}
