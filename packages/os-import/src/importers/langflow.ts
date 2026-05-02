// Langflow flow JSON → AgentsKitOS ConfigRoot subset.
// Pure transformation. Walks data.nodes + data.edges (React-Flow shape).

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Importer, ImportResult, ImportWarning } from '../types.js'

type LangflowNode = {
  id: string
  type?: string
  position?: { x?: number; y?: number }
  data?: {
    id?: string
    type?: string
    display_name?: string
    node?: {
      template?: Record<string, unknown>
      base_classes?: readonly string[]
      description?: string
    }
  }
}

type LangflowEdge = {
  id?: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

type LangflowFlow = {
  id?: string
  name?: string
  flow_name?: string
  description?: string
  data?: {
    nodes?: readonly LangflowNode[]
    edges?: readonly LangflowEdge[]
  }
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

const isFlow = (v: unknown): v is LangflowFlow => {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  if (typeof obj['data'] !== 'object' || obj['data'] === null) return false
  if (obj['name'] === undefined && obj['flow_name'] === undefined) return false
  return true
}

// Component-type → node kind heuristic. Langflow ships hundreds of types;
// catalog covers most common LLM + tool patterns. Unknown defaults to tool.
const LLM_TYPES = /chat|llm|openai|anthropic|gemini|cohere|mistral|groq|ollama|bedrock/i
const TOOL_TYPES = /tool|search|wikipedia|requests|http|sql|api|fetch|scraper|browser/i
const HUMAN_TYPES = /chatinput|chatoutput|input|output|prompt/i
const RAG_TYPES = /retriever|vector|embedding|rag|document/i

const inferKind = (type: string): 'agent' | 'tool' | 'human' => {
  // HUMAN check first — ChatInput/ChatOutput share "chat" prefix with LLM_TYPES
  if (HUMAN_TYPES.test(type)) return 'human'
  if (LLM_TYPES.test(type)) return 'agent'
  return 'tool'
}

const extractModel = (
  template: Record<string, unknown> | undefined,
): { provider: string; model: string } => {
  if (!template) return { provider: 'openai', model: 'gpt-4o' }
  const candidate = template['model_name'] ?? template['model'] ?? template['model_id']
  const value =
    typeof candidate === 'object' && candidate !== null
      ? (candidate as Record<string, unknown>)['value']
      : candidate
  const model = typeof value === 'string' && value.length > 0 ? value : 'gpt-4o'
  const provider = /^claude/i.test(model)
    ? 'anthropic'
    : /^gemini/i.test(model)
      ? 'gemini'
      : /^command/i.test(model)
        ? 'cohere'
        : 'openai'
  return { provider, model }
}

export const langflowImporter: Importer = {
  source: 'langflow',
  displayName: 'Langflow',
  detect: isFlow,
  parse: (input) => {
    if (!isFlow(input)) {
      throw new Error('langflowImporter: input is not a Langflow flow')
    }
    const warnings: ImportWarning[] = []
    const flowName = input.flow_name ?? input.name ?? 'imported-langflow'
    const workspaceId = slugify(input.id ?? flowName)
    const flowId = slugify(flowName)

    const nodes = input.data?.nodes ?? []
    const edges = input.data?.edges ?? []

    const takenNodeIds = new Set<string>()
    const takenAgentIds = new Set<string>()
    const idMap = new Map<string, string>()
    const agents: ReturnType<typeof parseAgentConfig>[] = []
    const flowNodes: Array<Record<string, unknown>> = []

    for (const n of nodes) {
      const componentType = n.data?.type ?? n.type ?? 'unknown'
      const displayName = n.data?.display_name ?? componentType
      const kind = inferKind(componentType)
      const baseId = ensureUnique(slugify(displayName), takenNodeIds)
      idMap.set(n.id, baseId)

      if (kind === 'agent') {
        const agentId = ensureUnique(slugify(`${displayName}-agent`), takenAgentIds)
        const model = extractModel(n.data?.node?.template)
        try {
          agents.push(parseAgentConfig({ id: agentId, name: displayName, model }))
        } catch (err) {
          warnings.push({
            code: 'lossy_conversion',
            path: ['nodes', n.id, 'agent'],
            message: `agent parse failed: ${(err as Error).message}`,
          })
        }
        flowNodes.push({ id: baseId, kind: 'agent', agent: agentId })
      } else if (kind === 'human') {
        flowNodes.push({
          id: baseId,
          kind: 'human',
          prompt: `Langflow ${componentType} (${displayName})`,
        })
      } else {
        flowNodes.push({
          id: baseId,
          kind: 'tool',
          tool: `langflow.${slugify(componentType)}`.slice(0, 128),
        })
        const known =
          LLM_TYPES.test(componentType) ||
          TOOL_TYPES.test(componentType) ||
          HUMAN_TYPES.test(componentType) ||
          RAG_TYPES.test(componentType)
        if (!known) {
          warnings.push({
            code: 'unknown_node_type',
            path: ['nodes', n.id],
            message: `unfamiliar Langflow component "${componentType}" — emitted as generic tool`,
          })
        }
      }
    }

    const flowEdges: Array<{ from: string; to: string }> = []
    for (const e of edges) {
      const from = idMap.get(e.source)
      const to = idMap.get(e.target)
      if (from && to) flowEdges.push({ from, to })
    }

    if (flowNodes.length === 0) {
      throw new Error('langflowImporter: flow has no nodes')
    }

    const entryId = (flowNodes[0]?.id as string | undefined) ?? 'entry'
    const flow = parseFlowConfig({
      id: flowId,
      name: flowName,
      entry: entryId,
      nodes: flowNodes as never,
      edges: flowEdges,
    })

    return {
      source: 'langflow',
      workspace: { id: workspaceId, name: flowName },
      agents,
      flows: [flow],
      warnings,
    } satisfies ImportResult
  },
}
