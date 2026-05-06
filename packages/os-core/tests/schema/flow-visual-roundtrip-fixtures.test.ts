// #174 — fixture-driven GUI ↔ YAML round-trip parity for every flow shape
// the visual editor ships against. Lives next to flow-visual.test.ts to keep
// per-kind coverage close, but exercises a *spread* of realistic flows so
// regressions in the visual layout adapter surface as fixture-level diffs.

import { describe, expect, it } from 'vitest'
import { parseFlowConfig, type FlowConfig } from '../../src/schema/flow.js'
import {
  assertVisualFlowRoundTrip,
  flowConfigToVisualDocument,
  visualDocumentToFlowConfig,
  visualEdgeId,
} from '../../src/schema/flow-visual.js'

const LINEAR_FLOW: FlowConfig = {
  id: 'linear-research',
  name: 'Linear Research',
  description: 'Straight-shot research → summarise → review.',
  entry: 'researcher',
  tags: ['fixture', 'linear'],
  nodes: [
    { id: 'researcher', kind: 'agent', agent: 'researcher' },
    { id: 'summary', kind: 'agent', agent: 'summariser' },
    { id: 'review', kind: 'human', prompt: 'Approve summary?' },
  ],
  edges: [
    { from: 'researcher', to: 'summary', on: 'success' },
    { from: 'summary', to: 'review', on: 'success' },
  ],
}

const BRANCHING_FLOW: FlowConfig = {
  id: 'branching-fix',
  name: 'Branching Fix',
  description: 'Conditional routes diverge then re-converge.',
  entry: 'plan',
  tags: ['fixture', 'branching'],
  nodes: [
    { id: 'plan', kind: 'agent', agent: 'planner' },
    { id: 'route', kind: 'condition', expression: 'plan.kind === "patch"' },
    { id: 'patch', kind: 'tool', tool: 'tools.git.diff' },
    { id: 'rewrite', kind: 'agent', agent: 'rewriter' },
    { id: 'merge', kind: 'agent', agent: 'merger' },
  ],
  edges: [
    { from: 'plan', to: 'route', on: 'success' },
    { from: 'route', to: 'patch', on: 'true' },
    { from: 'route', to: 'rewrite', on: 'false' },
    { from: 'patch', to: 'merge', on: 'success' },
    { from: 'rewrite', to: 'merge', on: 'success' },
  ],
}

const PARALLEL_FLOW: FlowConfig = {
  id: 'parallel-eval',
  name: 'Parallel Eval',
  description: 'Fan-out two reviewers, fan-in via vote.',
  entry: 'fanout',
  tags: ['fixture', 'parallel'],
  nodes: [
    { id: 'fanout', kind: 'parallel', branches: ['gpt-review', 'claude-review'] },
    { id: 'gpt-review', kind: 'agent', agent: 'gpt-reviewer' },
    { id: 'claude-review', kind: 'agent', agent: 'claude-reviewer' },
    {
      id: 'vote',
      kind: 'vote',
      agents: ['gpt-reviewer', 'claude-reviewer', 'gemini-reviewer'],
      ballot: { mode: 'majority' },
      outputType: 'classification',
      onTie: 'human',
    },
  ],
  edges: [
    { from: 'fanout', to: 'gpt-review', on: 'always' },
    { from: 'fanout', to: 'claude-review', on: 'always' },
    { from: 'gpt-review', to: 'vote', on: 'success' },
    { from: 'claude-review', to: 'vote', on: 'success' },
  ],
}

const RETRY_FLOW: FlowConfig = {
  id: 'retry-flow',
  name: 'Retry Flow',
  description: 'Single agent with retry policy + tool fallback.',
  entry: 'attempt',
  tags: ['fixture', 'retry'],
  nodes: [
    {
      id: 'attempt',
      kind: 'agent',
      agent: 'optimistic',
      retryPolicy: { maxRetries: 3, backoffMs: 1000, jitter: true },
    },
    { id: 'rescue', kind: 'tool', tool: 'tools.notify.slack' },
  ],
  edges: [
    { from: 'attempt', to: 'rescue', on: 'failure' },
  ],
}

const FIXTURES: ReadonlyArray<{ name: string; flow: FlowConfig }> = [
  { name: 'linear', flow: LINEAR_FLOW },
  { name: 'branching', flow: BRANCHING_FLOW },
  { name: 'parallel', flow: PARALLEL_FLOW },
  { name: 'retry', flow: RETRY_FLOW },
]

describe('GUI ↔ YAML round-trip fixtures (#174)', () => {
  for (const { name, flow } of FIXTURES) {
    const parsed = parseFlowConfig(flow)

    it(`round-trips fixture "${name}" without losing fields`, () => {
      expect(assertVisualFlowRoundTrip(parsed)).toEqual(parsed)
    })

    it(`fixture "${name}" survives JSON-canonical serialization`, () => {
      const visual = flowConfigToVisualDocument(parsed)
      const wireRound = JSON.parse(JSON.stringify(visual)) as typeof visual
      expect(visualDocumentToFlowConfig(wireRound)).toEqual(parsed)
    })

    it(`fixture "${name}" carries deterministic visual edge ids`, () => {
      const visual = flowConfigToVisualDocument(parsed)
      const direct = parsed.edges.map((e) => visualEdgeId(e))
      expect(visual.edges.map((e) => e.id)).toEqual(direct)
    })
  }
})
