import { z } from 'zod'
import { Slug } from './_primitives.js'
import {
  FlowConfig,
  FlowEdge,
  FlowNode,
  parseFlowConfig,
  type FlowConfig as FlowConfigType,
} from './flow.js'

export const VisualPoint = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})
export type VisualPoint = z.infer<typeof VisualPoint>

export const VisualFlowLayout = z.object({
  nodePositions: z.record(Slug, VisualPoint).default({}),
  edgeWaypoints: z.record(z.string().min(1).max(256), z.array(VisualPoint).max(64)).default({}),
})
export type VisualFlowLayout = z.infer<typeof VisualFlowLayout>

export const VisualFlowNodeKind = z.enum([
  'agent',
  'tool',
  'human',
  'condition',
  'parallel',
  'compare',
  'vote',
  'debate',
  'auction',
  'blackboard',
])
export type VisualFlowNodeKind = z.infer<typeof VisualFlowNodeKind>

export const VisualFlowNode = z
  .object({
    id: Slug,
    kind: VisualFlowNodeKind,
    data: FlowNode,
    position: VisualPoint.optional(),
  })
  .superRefine((node, ctx) => {
    if (node.id !== node.data.id) {
      ctx.addIssue({
        code: 'custom',
        path: ['data', 'id'],
        message: 'visual node id must match FlowNode.id',
      })
    }
    if (node.kind !== node.data.kind) {
      ctx.addIssue({
        code: 'custom',
        path: ['data', 'kind'],
        message: 'visual node kind must match FlowNode.kind',
      })
    }
  })
export type VisualFlowNode = z.infer<typeof VisualFlowNode>

export const VisualFlowEdge = z.object({
  id: z.string().min(1).max(256),
  from: Slug,
  to: Slug,
  on: FlowEdge.shape.on,
  waypoints: z.array(VisualPoint).max(64).optional(),
})
export type VisualFlowEdge = z.infer<typeof VisualFlowEdge>

export const VisualFlowDocument = z
  .object({
    format: z.literal('agentskit-os/visual-flow@1').default('agentskit-os/visual-flow@1'),
    flowId: Slug,
    name: z.string().min(1).max(128),
    description: z.string().max(1024).optional(),
    entry: Slug,
    tags: z.array(z.string().min(1).max(64)).max(32).default([]),
    nodes: z.array(VisualFlowNode).min(1).max(512),
    edges: z.array(VisualFlowEdge).max(2048).default([]),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set(doc.nodes.map((node) => node.id))
    for (const edge of doc.edges) {
      if (!ids.has(edge.from)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message: `visual edge from "${edge.from}" missing`,
        })
      }
      if (!ids.has(edge.to)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message: `visual edge to "${edge.to}" missing`,
        })
      }
    }
  })
export type VisualFlowDocument = z.infer<typeof VisualFlowDocument>

export const visualEdgeId = (edge: Pick<FlowEdge, 'from' | 'to' | 'on'>): string =>
  `${edge.from}->${edge.to}:${edge.on}`

const cloneFlowNode = (node: FlowNode): FlowNode => structuredClone(node) as FlowNode

export const flowConfigToVisualDocument = (
  flowInput: FlowConfigType,
  layoutInput: Partial<VisualFlowLayout> = {},
): VisualFlowDocument => {
  const flow = parseFlowConfig(flowInput)
  const layout = VisualFlowLayout.parse(layoutInput)
  return VisualFlowDocument.parse({
    flowId: flow.id,
    name: flow.name,
    description: flow.description,
    entry: flow.entry,
    tags: flow.tags,
    nodes: flow.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      data: cloneFlowNode(node),
      position: layout.nodePositions[node.id],
    })),
    edges: flow.edges.map((edge) => {
      const id = visualEdgeId(edge)
      return {
        id,
        from: edge.from,
        to: edge.to,
        on: edge.on,
        waypoints: layout.edgeWaypoints[id],
      }
    }),
  })
}

export const visualDocumentToFlowConfig = (documentInput: VisualFlowDocument): FlowConfigType => {
  const document = VisualFlowDocument.parse(documentInput)
  return parseFlowConfig({
    id: document.flowId,
    name: document.name,
    description: document.description,
    entry: document.entry,
    tags: document.tags,
    nodes: document.nodes.map((node) => cloneFlowNode(node.data)),
    edges: document.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      on: edge.on,
    })),
  })
}

export const assertVisualFlowRoundTrip = (flowInput: FlowConfigType): FlowConfigType => {
  const parsed = parseFlowConfig(flowInput)
  const visual = flowConfigToVisualDocument(parsed)
  const roundTripped = visualDocumentToFlowConfig(visual)
  return parseFlowConfig(roundTripped)
}

export const parseVisualFlowDocument = (input: unknown): VisualFlowDocument =>
  VisualFlowDocument.parse(input)

export const safeParseVisualFlowDocument = (input: unknown) =>
  VisualFlowDocument.safeParse(input)
