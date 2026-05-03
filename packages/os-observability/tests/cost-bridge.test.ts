import { describe, expect, it, vi } from 'vitest'
import {
  InMemoryMetricSink,
  costEntryToMetricPoints,
  createCostMetricsRecorder,
  type CostEntryShape,
  type MetricSink,
} from '../src/index.js'

const entry = (overrides: Partial<CostEntryShape> = {}): CostEntryShape => ({
  system: 'anthropic',
  model: 'claude-opus-4-7',
  costUsd: 0.0042,
  inputTokens: 100,
  outputTokens: 50,
  recordedAt: '2026-05-02T17:00:00.000Z',
  ...overrides,
})

describe('costEntryToMetricPoints', () => {
  it('emits cost + input + output points by default', () => {
    const points = costEntryToMetricPoints(entry())
    expect(points.map((p) => p.name)).toEqual([
      'agentskitos_run_cost_usd',
      'agentskitos_llm_input_tokens',
      'agentskitos_llm_output_tokens',
    ])
  })

  it('omits token points when tokens missing', () => {
    const points = costEntryToMetricPoints(
      entry({ inputTokens: undefined, outputTokens: undefined }),
    )
    expect(points.length).toBe(1)
    expect(points[0]!.name).toBe('agentskitos_run_cost_usd')
  })

  it('cost point has unit USD', () => {
    expect(costEntryToMetricPoints(entry())[0]!.unit).toBe('USD')
  })

  it('forwards system + model + nodeId as labels', () => {
    const p = costEntryToMetricPoints(entry({ nodeId: 'n1' }))[0]!
    expect(p.labels).toEqual({ system: 'anthropic', model: 'claude-opus-4-7', node_id: 'n1' })
  })

  it('omits node_id when nodeId absent', () => {
    const p = costEntryToMetricPoints(entry())[0]!
    expect(p.labels).not.toHaveProperty('node_id')
  })

  it('attaches workspace_id + run_id from labels arg', () => {
    const p = costEntryToMetricPoints(entry(), { workspaceId: 'team-a', runId: 'run_1' })[0]!
    expect(p.labels['workspace_id']).toBe('team-a')
    expect(p.labels['run_id']).toBe('run_1')
  })

  it('merges extra labels last (caller overrides take precedence)', () => {
    const p = costEntryToMetricPoints(entry(), { extra: { system: 'override' } })[0]!
    expect(p.labels['system']).toBe('override')
  })

  it('time copies recordedAt straight through', () => {
    const p = costEntryToMetricPoints(entry({ recordedAt: '2026-01-01T00:00:00.000Z' }))[0]!
    expect(p.time).toBe('2026-01-01T00:00:00.000Z')
  })

  it('handles zero cost / zero tokens cleanly', () => {
    const points = costEntryToMetricPoints(entry({ costUsd: 0, inputTokens: 0, outputTokens: 0 }))
    expect(points.length).toBe(3)
    expect(points.every((p) => p.value === 0)).toBe(true)
  })
})

describe('createCostMetricsRecorder', () => {
  it('records all points to sink', async () => {
    const sink = new InMemoryMetricSink()
    const rec = createCostMetricsRecorder({ sink })
    await rec(entry(), 'run_1')
    expect(sink.size).toBe(3)
  })

  it('threads runId through label set', async () => {
    const sink = new InMemoryMetricSink()
    const rec = createCostMetricsRecorder({ sink })
    await rec(entry(), 'run_xyz')
    expect(sink.all()[0]!.labels['run_id']).toBe('run_xyz')
  })

  it('accepts workspaceId via opts', async () => {
    const sink = new InMemoryMetricSink()
    const rec = createCostMetricsRecorder({ sink, workspaceId: 'team-z' })
    await rec(entry())
    expect(sink.all()[0]!.labels['workspace_id']).toBe('team-z')
  })

  it('extra labels propagate', async () => {
    const sink = new InMemoryMetricSink()
    const rec = createCostMetricsRecorder({ sink, extra: { region: 'us-east-1' } })
    await rec(entry())
    expect(sink.all()[0]!.labels['region']).toBe('us-east-1')
  })

  it('forwards sink throws to onError', async () => {
    const onError = vi.fn()
    const broken: MetricSink = { record: () => { throw new Error('boom') } }
    const rec = createCostMetricsRecorder({ sink: broken, onError })
    await rec(entry())
    expect(onError).toHaveBeenCalled()
  })

  it('aggregates over multiple entries by series key', async () => {
    const sink = new InMemoryMetricSink()
    const rec = createCostMetricsRecorder({ sink, workspaceId: 'team-a' })
    await rec(entry({ costUsd: 0.001 }), 'run_1')
    await rec(entry({ costUsd: 0.002 }), 'run_1')
    const agg = sink.aggregate('agentskitos_run_cost_usd', {
      workspace_id: 'team-a',
      run_id: 'run_1',
      system: 'anthropic',
      model: 'claude-opus-4-7',
    })
    expect(agg?.kind).toBe('counter')
    if (agg?.kind === 'counter') {
      expect(agg.sum).toBeCloseTo(0.003, 6)
      expect(agg.count).toBe(2)
    }
  })
})
