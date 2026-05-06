import { describe, expect, it } from 'vitest'
import {
  buildDecisionLogEntry,
  filterDecisionLog,
  type DecisionLogEntry,
} from '../src/decision-log.js'

const fixed = () => '2026-05-06T12:00:00Z'

describe('buildDecisionLogEntry (#214)', () => {
  it('fills entryId, alternatives, tags defaults', () => {
    const e = buildDecisionLogEntry(
      {
        runId: 'r1',
        nodeId: 'n1',
        agentId: 'planner',
        chosen: 'tools.git.diff',
        choiceKind: 'tool',
        rationale: 'Need code diff to plan changes.',
      },
      { clock: fixed },
    )
    expect(e.entryId).toBe('r1:n1:2026-05-06T12:00:00Z')
    expect(e.alternatives).toEqual([])
    expect(e.tags).toEqual([])
    expect(e.schemaVersion).toBe('1.0')
  })

  it('preserves caller-supplied alternatives + confidence', () => {
    const e = buildDecisionLogEntry({
      runId: 'r',
      nodeId: 'n',
      agentId: 'a',
      chosen: 'shell',
      choiceKind: 'tool',
      rationale: 'fast',
      alternatives: [
        { id: 'tools.git.diff', score: 0.4 },
        { id: 'tools.shell.run', score: 0.8 },
      ],
      confidence: 0.92,
    })
    expect(e.alternatives).toHaveLength(2)
    expect(e.confidence).toBeCloseTo(0.92)
  })
})

const sample: readonly DecisionLogEntry[] = [
  buildDecisionLogEntry({
    runId: 'r1', nodeId: 'n1', agentId: 'a1',
    chosen: 'tool-x', choiceKind: 'tool', rationale: 'r',
  }),
  buildDecisionLogEntry({
    runId: 'r1', nodeId: 'n2', agentId: 'a2',
    chosen: 'branch-y', choiceKind: 'branch', rationale: 'r',
  }),
  buildDecisionLogEntry({
    runId: 'r2', nodeId: 'n1', agentId: 'a1',
    chosen: 'tool-x', choiceKind: 'tool', rationale: 'r',
  }),
]

describe('filterDecisionLog (#214)', () => {
  it('filters by runId', () => {
    expect(filterDecisionLog(sample, { runId: 'r1' })).toHaveLength(2)
  })
  it('filters by chosen + choiceKind', () => {
    const out = filterDecisionLog(sample, { chosen: 'tool-x', choiceKind: 'tool' })
    expect(out).toHaveLength(2)
  })
})
