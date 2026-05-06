import { describe, expect, it } from 'vitest'
import { parseFlowConfig, type FlowConfig } from '@agentskit/os-core'
import { simulateWhatIf } from '../src/what-if-simulator.js'

const flow = (over: Partial<FlowConfig> = {}): FlowConfig =>
  parseFlowConfig({
    id: 'flow-a',
    name: 'Flow A',
    description: '',
    entry: 'a',
    tags: [],
    nodes: [
      { id: 'a', kind: 'agent', agent: 'researcher' },
      { id: 'b', kind: 'tool', tool: 'tools.git.diff' },
    ],
    edges: [{ from: 'a', to: 'b', on: 'success' }],
    ...over,
  })

describe('simulateWhatIf (#98)', () => {
  it('reports node + edge diffs vs the running flow', () => {
    const running = flow()
    const candidate = flow({
      nodes: [
        { id: 'a', kind: 'agent', agent: 'researcher' },
        { id: 'b', kind: 'tool', tool: 'tools.git.diff' },
        { id: 'c', kind: 'human', prompt: 'Approve?' },
      ],
      edges: [
        { from: 'a', to: 'b', on: 'success' },
        { from: 'b', to: 'c', on: 'success' },
      ],
    })
    const report = simulateWhatIf({
      running,
      candidate,
      trace: {
        runId: 'r1',
        entry: 'a',
        steps: [
          { nodeId: 'a', status: 'ok', costUsd: 0.05 },
          { nodeId: 'b', status: 'ok', costUsd: 0.01 },
        ],
      },
      project: (_node, recorded) => ({
        status: recorded?.status ?? 'ok',
        costUsd: recorded?.costUsd ?? 0,
      }),
    })
    expect(report.nodesAdded).toEqual(['c'])
    expect(report.nodesRemoved).toEqual([])
    expect(report.edgesAdded).toEqual(['b->c:success'])
    expect(report.edgesRemoved).toEqual([])
  })

  it('computes cost delta when the projector returns a higher per-node cost', () => {
    const running = flow()
    const candidate = flow()
    const report = simulateWhatIf({
      running,
      candidate,
      trace: {
        runId: 'r1',
        entry: 'a',
        steps: [
          { nodeId: 'a', status: 'ok', costUsd: 0.05 },
          { nodeId: 'b', status: 'ok', costUsd: 0.01 },
        ],
      },
      project: (node, recorded) => ({
        status: 'ok',
        costUsd: node.id === 'a' ? 0.10 : recorded?.costUsd ?? 0,
      }),
    })
    expect(report.totalPreviousCostUsd).toBeCloseTo(0.06)
    expect(report.totalProjectedCostUsd).toBeCloseTo(0.11)
    expect(report.costDeltaUsd).toBeCloseTo(0.05)
  })
})
