import { describe, expect, it } from 'vitest'
import type { FlowConfig } from '../../src/schema/flow.js'
import {
  assertVisualFlowRoundTrip,
  flowConfigToVisualDocument,
  parseVisualFlowDocument,
  visualDocumentToFlowConfig,
} from '../../src/schema/flow-visual.js'

const ALL_NODE_KINDS_FLOW: FlowConfig = {
  id: 'all-node-kinds',
  name: 'All node kinds',
  description: 'Fixture used to keep GUI and YAML flow authoring lossless.',
  entry: 'agent-start',
  tags: ['visual-editor', 'round-trip'],
  nodes: [
    { id: 'agent-start', kind: 'agent', agent: 'researcher', input: { prompt: 'Summarize context' } },
    { id: 'tool-fetch', kind: 'tool', tool: 'tools.git.diff', input: { from: 'main', to: 'HEAD' } },
    {
      id: 'human-approval',
      kind: 'human',
      prompt: 'Approve the generated release summary?',
      approvers: ['account-manager', 'client'],
      quorum: 2,
    },
    { id: 'condition-risk', kind: 'condition', expression: 'risk.score < 0.8' },
    { id: 'parallel-fanout', kind: 'parallel', branches: ['compare-models', 'vote-policy'] },
    {
      id: 'compare-models',
      kind: 'compare',
      agents: ['gpt-reviewer', 'claude-reviewer'],
      selection: { mode: 'judge', judgeAgent: 'lead-reviewer', criteria: 'Most complete, least risky answer' },
      isolation: 'isolated',
    },
    {
      id: 'vote-policy',
      kind: 'vote',
      agents: ['policy-a', 'policy-b', 'policy-c'],
      ballot: { mode: 'majority' },
      outputType: 'classification',
      onTie: 'human',
    },
    {
      id: 'debate-risk',
      kind: 'debate',
      proponent: 'shipper',
      opponent: 'risk-reviewer',
      judge: 'lead-reviewer',
      topic: 'Should this campaign be published?',
      rounds: 2,
      format: 'point-counterpoint',
      earlyExit: 'judge-decides',
    },
    {
      id: 'auction-task',
      kind: 'auction',
      bidders: ['cheap-model', 'fast-model'],
      task: 'Generate final copy variants',
      bidCriteria: 'lowest-cost',
      reservePrice: { usd: 0.25 },
      fallback: 'human-approval',
    },
    {
      id: 'blackboard-swarm',
      kind: 'blackboard',
      agents: ['researcher', 'planner'],
      scratchpad: { kind: 'in-memory' },
      schedule: { mode: 'round-robin' },
      termination: { mode: 'rounds', n: 3 },
    },
  ],
  edges: [
    { from: 'agent-start', to: 'tool-fetch', on: 'success' },
    { from: 'tool-fetch', to: 'human-approval', on: 'success' },
    { from: 'human-approval', to: 'condition-risk', on: 'success' },
    { from: 'condition-risk', to: 'parallel-fanout', on: 'true' },
    { from: 'parallel-fanout', to: 'compare-models', on: 'always' },
    { from: 'parallel-fanout', to: 'vote-policy', on: 'always' },
    { from: 'compare-models', to: 'debate-risk', on: 'success' },
    { from: 'vote-policy', to: 'debate-risk', on: 'success' },
    { from: 'debate-risk', to: 'auction-task', on: 'success' },
    { from: 'auction-task', to: 'blackboard-swarm', on: 'success' },
  ],
}

describe('VisualFlowDocument round-trip', () => {
  it('strips layout and round-trips every FlowNode kind back to FlowConfig', () => {
    const visual = flowConfigToVisualDocument(ALL_NODE_KINDS_FLOW, {
      nodePositions: {
        'agent-start': { x: 0, y: 0 },
        'tool-fetch': { x: 240, y: 0 },
      },
      edgeWaypoints: {
        'agent-start->tool-fetch:success': [{ x: 120, y: 24 }],
      },
    })

    expect(visual.nodes.map((node) => node.kind)).toEqual([
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
    expect(visual.nodes[0]?.position).toEqual({ x: 0, y: 0 })
    expect(visual.edges[0]?.waypoints).toEqual([{ x: 120, y: 24 }])
    expect(visualDocumentToFlowConfig(visual)).toEqual(ALL_NODE_KINDS_FLOW)
  })

  it('validates visual node id/kind mirrors the embedded FlowNode', () => {
    const visual = flowConfigToVisualDocument(ALL_NODE_KINDS_FLOW)

    expect(() =>
      parseVisualFlowDocument({
        ...visual,
        nodes: [{ ...visual.nodes[0], id: 'different-id' }, ...visual.nodes.slice(1)],
      }),
    ).toThrow(/visual node id/)
    expect(() =>
      parseVisualFlowDocument({
        ...visual,
        nodes: [{ ...visual.nodes[0], kind: 'tool' }, ...visual.nodes.slice(1)],
      }),
    ).toThrow(/visual node kind/)
  })

  it('keeps GUI-derived flow equal to hand-authored YAML canonical object', () => {
    expect(assertVisualFlowRoundTrip(ALL_NODE_KINDS_FLOW)).toEqual(ALL_NODE_KINDS_FLOW)
  })
})
