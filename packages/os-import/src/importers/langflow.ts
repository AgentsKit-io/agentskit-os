// Langflow flow JSON → AgentsKitOS ConfigRoot subset.
// Pure transformation. Walks data.nodes + data.edges (React-Flow shape).

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Importer, ImportResult, ImportWarning } from '../types.js'

type LangflowNode = {
  id: string
  type: string | undefined
  position:
    | {
        x: number | undefined
        y: number | undefined
      }
    | undefined
  data:
    | {
        id: string | undefined
        type: string | undefined
        display_name: string | undefined
        node:
          | {
              template: Record<string, unknown> | undefined
              base_classes: readonly string[] | undefined
              description: string | undefined
            }
          | undefined
      }
    | undefined
}

type LangflowEdge = {
  id: string | undefined
  source: string
  target: string
  sourceHandle: string | undefined
  targetHandle: string | undefined
}

type LangflowFlow = {
  id: string | undefined
  name: string | undefined
  flow_name: string | undefined
  description: string | undefined
  data:
    | {
        nodes: readonly LangflowNode[] | undefined
        edges: readonly LangflowEdge[] | undefined
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
  let candidate: unknown = template['model_name']
  if (candidate === undefined) candidate = template['model']
  if (candidate === undefined) candidate = template['model_id']
  let value: unknown = candidate
  if (typeof candidate === 'object' && candidate !== null) {
    value = (candidate as Record<string, unknown>)['value']
  }
  let model = 'gpt-4o'
  if (typeof value === 'string' && value.length > 0) model = value
  let provider = 'openai'
  if (/^claude/i.test(model)) provider = 'anthropic'
  else if (/^gemini/i.test(model)) provider = 'gemini'
  else if (/^command/i.test(model)) provider = 'cohere'
  return { provider, model }
}

const getLangflowName = (input: LangflowFlow): string => {
  if (input.flow_name !== undefined) return input.flow_name
  if (input.name !== undefined) return input.name
  return 'imported-langflow'
}

const readComponentType = (n: LangflowNode): string => {
  if (n.data !== undefined && n.data.type !== undefined) return n.data.type
  if (n.type !== undefined) return n.type
  return 'unknown'
}

const readDisplayName = (n: LangflowNode, componentType: string): string => {
  if (n.data !== undefined && n.data.display_name !== undefined) return n.data.display_name
  return componentType
}

const isKnownLangflowType = (componentType: string): boolean => {
  return (
    LLM_TYPES.test(componentType) ||
    TOOL_TYPES.test(componentType) ||
    HUMAN_TYPES.test(componentType) ||
    RAG_TYPES.test(componentType)
  )
}

const buildLangflowNodes = (args: {
  nodes: readonly LangflowNode[]
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
    const componentType = readComponentType(n)
    const displayName = readDisplayName(n, componentType)
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
      continue
    }

    if (kind === 'human') {
      flowNodes.push({ id: baseId, kind: 'human', prompt: `Langflow ${componentType} (${displayName})` })
      continue
    }

    flowNodes.push({ id: baseId, kind: 'tool', tool: `langflow.${slugify(componentType)}`.slice(0, 128) })
    if (!isKnownLangflowType(componentType)) {
      warnings.push({
        code: 'unknown_node_type',
        path: ['nodes', n.id],
        message: `unfamiliar Langflow component "${componentType}" — emitted as generic tool`,
      })
    }
  }

  return { agents, flowNodes, idMap }
}

const buildLangflowEdges = (edges: readonly LangflowEdge[], idMap: Map<string, string>): Array<{ from: string; to: string }> => {
  const flowEdges: Array<{ from: string; to: string }> = []
  for (const e of edges) {
    const from = idMap.get(e.source)
    const to = idMap.get(e.target)
    if (from && to) flowEdges.push({ from, to })
  }
  return flowEdges
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
    const flowName = getLangflowName(input)
    const workspaceId = slugify(input.id ?? flowName)
    const flowId = slugify(flowName)

    const nodes = input.data?.nodes ?? []
    const built = buildLangflowNodes({ nodes, warnings })
    if (built.flowNodes.length === 0) throw new Error('langflowImporter: flow has no nodes')
    const edges = input.data?.edges ?? []
    const flowEdges = buildLangflowEdges(edges, built.idMap)
    const entryId = (built.flowNodes[0]?.id as string | undefined) ?? 'entry'
    const flow = parseFlowConfig({
      id: flowId,
      name: flowName,
      entry: entryId,
      nodes: built.flowNodes as never,
      edges: flowEdges,
    })

    return {
      source: 'langflow',
      workspace: { id: workspaceId, name: flowName },
      agents: built.agents,
      flows: [flow],
      warnings,
    } satisfies ImportResult
  },
}
