// Per #61 — `agentskit-os flow new` template seeds.
// Pure: a small library of starter visual-editor-ready FlowConfig seeds the
// `flow new` command can scaffold. Each seed is a parsed FlowConfig + a
// human label + tags so the CLI prompt + visual editor can render them.

import { parseFlowConfig, type FlowConfig } from '@agentskit/os-core'

export type FlowTemplateSeed = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tags: readonly string[]
  readonly flow: FlowConfig
}

const minimalAgent: FlowConfig = parseFlowConfig({
  id: 'flow-blank-agent',
  name: 'Blank Agent',
  description: 'One agent + one human approval gate.',
  entry: 'agent',
  tags: ['blank', 'starter'],
  nodes: [
    { id: 'agent', kind: 'agent', agent: 'main' },
    { id: 'approve', kind: 'human', prompt: 'Approve?' },
  ],
  edges: [{ from: 'agent', to: 'approve', on: 'success' }],
})

const compareTwoAgents: FlowConfig = parseFlowConfig({
  id: 'flow-compare-2',
  name: 'Compare Two Agents',
  description: 'Two agents produce candidates; judge picks the best.',
  entry: 'compare',
  tags: ['compare', 'judge', 'starter'],
  nodes: [
    {
      id: 'compare',
      kind: 'compare',
      agents: ['candidate-a', 'candidate-b'],
      selection: { mode: 'judge', judgeAgent: 'judge', criteria: 'best answer' },
    },
  ],
  edges: [],
})

const triggerToTool: FlowConfig = parseFlowConfig({
  id: 'flow-trigger-to-tool',
  name: 'Trigger to Tool',
  description: 'Webhook → agent → tool, with HITL on failure.',
  entry: 'agent',
  tags: ['webhook', 'tool', 'starter'],
  nodes: [
    { id: 'agent', kind: 'agent', agent: 'planner' },
    { id: 'tool', kind: 'tool', tool: 'tools.git.diff' },
    { id: 'fix', kind: 'human', prompt: 'Tool failed — intervene?' },
  ],
  edges: [
    { from: 'agent', to: 'tool', on: 'success' },
    { from: 'tool', to: 'fix', on: 'failure' },
  ],
})

export const FLOW_TEMPLATE_SEEDS: ReadonlyArray<FlowTemplateSeed> = [
  {
    id: 'blank-agent',
    title: 'Blank Agent',
    description: 'Single agent + human approval. Good first run.',
    tags: ['starter', 'minimal'],
    flow: minimalAgent,
  },
  {
    id: 'compare-2',
    title: 'Compare Two Agents',
    description: 'Two-candidate compare with a judge.',
    tags: ['starter', 'compare'],
    flow: compareTwoAgents,
  },
  {
    id: 'trigger-to-tool',
    title: 'Trigger → Tool',
    description: 'Agent invokes a tool; failure routes to HITL.',
    tags: ['starter', 'tool'],
    flow: triggerToTool,
  },
]

export const findFlowTemplateSeed = (id: string): FlowTemplateSeed | undefined =>
  FLOW_TEMPLATE_SEEDS.find((s) => s.id === id)
