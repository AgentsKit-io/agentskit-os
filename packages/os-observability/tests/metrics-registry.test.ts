import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus } from '@agentskit/os-core'
import {
  InMemoryMetricSink,
  createMetricsRegistry,
  eventCountRule,
  durationRule,
  costRule,
  type MetricRule,
  type MetricSink,
} from '../src/index.js'
import { fakeEvent } from './_helpers.js'

describe('default rules', () => {
  it('eventCountRule fires once per event', () => {
    expect(eventCountRule.value(fakeEvent())).toBe(1)
  })

  it('durationRule reads numeric durationMs only', () => {
    expect(durationRule.value(fakeEvent({ data: { durationMs: 250 } }))).toBe(250)
    expect(durationRule.value(fakeEvent({ data: { durationMs: '250' } }))).toBeUndefined()
    expect(durationRule.value(fakeEvent({ data: {} }))).toBeUndefined()
  })

  it('costRule reads numeric costUsd only', () => {
    expect(costRule.value(fakeEvent({ data: { costUsd: 0.0012 } }))).toBe(0.0012)
    expect(costRule.value(fakeEvent({ data: {} }))).toBeUndefined()
  })

  it('rejects NaN / Infinity', () => {
    expect(durationRule.value(fakeEvent({ data: { durationMs: NaN } }))).toBeUndefined()
    expect(costRule.value(fakeEvent({ data: { costUsd: Infinity } }))).toBeUndefined()
  })
})

describe('createMetricsRegistry', () => {
  it('records one event_count point per event', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ type: 'agent.task.completed' }))
    const counts = sink.byName('agentskitos_events_total')
    expect(counts.length).toBe(1)
    expect(counts[0]!.kind).toBe('counter')
    expect(counts[0]!.value).toBe(1)
  })

  it('skips rules whose value() returns undefined', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ data: { ok: true } }))
    expect(sink.byName('agentskitos_node_duration_ms').length).toBe(0)
    expect(sink.byName('agentskitos_run_cost_usd').length).toBe(0)
    expect(sink.byName('agentskitos_events_total').length).toBe(1)
  })

  it('emits histogram point for events with durationMs', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ type: 'flow.node.completed', data: { durationMs: 120 } }))
    const points = sink.byName('agentskitos_node_duration_ms')
    expect(points.length).toBe(1)
    expect(points[0]!.kind).toBe('histogram')
    expect(points[0]!.value).toBe(120)
    expect(points[0]!.unit).toBe('ms')
  })

  it('emits cost counter point for events with costUsd', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ type: 'agent.task.completed', data: { costUsd: 0.0005 } }))
    const points = sink.byName('agentskitos_run_cost_usd')
    expect(points.length).toBe(1)
    expect(points[0]!.unit).toBe('USD')
    expect(points[0]!.value).toBe(0.0005)
  })

  it('attaches workspace_id + type as default labels', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ workspaceId: 'team-x', type: 'flow.node.completed' }))
    expect(sink.all()[0]!.labels).toEqual({ workspace_id: 'team-x', type: 'flow.node.completed' })
  })

  it('honors custom rule list', async () => {
    const sink = new InMemoryMetricSink()
    const custom: MetricRule = {
      name: 'custom_gauge',
      kind: 'gauge',
      value: () => 7,
    }
    const r = createMetricsRegistry({ sink, rules: [custom] })
    await r(fakeEvent())
    expect(sink.byName('custom_gauge').length).toBe(1)
    expect(sink.byName('agentskitos_events_total').length).toBe(0)
  })

  it('forwards sink throws to onError without bubbling', async () => {
    const onError = vi.fn()
    const broken: MetricSink = { record: () => { throw new Error('boom') } }
    const r = createMetricsRegistry({ sink: broken, onError })
    await expect(r(fakeEvent())).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalled()
  })

  it('integrates with InMemoryEventBus.subscribe', async () => {
    const bus = new InMemoryEventBus()
    const sink = new InMemoryMetricSink()
    bus.subscribe('*', createMetricsRegistry({ sink }))
    await bus.publish(fakeEvent({ type: 'flow.node.completed', data: { durationMs: 50, costUsd: 0.001 } }))
    expect(sink.size).toBe(3)
  })
})

describe('InMemoryMetricSink aggregates', () => {
  it('counter sums values across same series', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ type: 'agent.task.completed' }))
    await r(fakeEvent({ type: 'agent.task.completed' }))
    await r(fakeEvent({ type: 'agent.task.completed' }))
    const agg = sink.aggregate('agentskitos_events_total', {
      workspace_id: 'team-a',
      type: 'agent.task.completed',
    })
    expect(agg).toEqual({ kind: 'counter', sum: 3, count: 3 })
  })

  it('histogram tracks count/sum/min/max/samples', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    for (const d of [10, 20, 5]) {
      await r(fakeEvent({ type: 'flow.node.completed', data: { durationMs: d } }))
    }
    const agg = sink.aggregate('agentskitos_node_duration_ms', {
      workspace_id: 'team-a',
      type: 'flow.node.completed',
    })
    expect(agg?.kind).toBe('histogram')
    if (agg?.kind === 'histogram') {
      expect(agg.count).toBe(3)
      expect(agg.sum).toBe(35)
      expect(agg.min).toBe(5)
      expect(agg.max).toBe(20)
      expect(agg.samples).toEqual([10, 20, 5])
    }
  })

  it('isolates aggregates by label set', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ workspaceId: 'a', type: 'x' }))
    await r(fakeEvent({ workspaceId: 'b', type: 'x' }))
    expect(sink.aggregate('agentskitos_events_total', { workspace_id: 'a', type: 'x' })).toEqual({ kind: 'counter', sum: 1, count: 1 })
    expect(sink.aggregate('agentskitos_events_total', { workspace_id: 'b', type: 'x' })).toEqual({ kind: 'counter', sum: 1, count: 1 })
  })

  it('series() lists all aggregates with parsed labels', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent({ workspaceId: 'team-a', type: 'agent.task.completed' }))
    const series = sink.series()
    const events = series.find((s) => s.name === 'agentskitos_events_total')!
    expect(events.labels).toEqual({ workspace_id: 'team-a', type: 'agent.task.completed' })
  })

  it('reset clears points + aggregates', async () => {
    const sink = new InMemoryMetricSink()
    const r = createMetricsRegistry({ sink })
    await r(fakeEvent())
    expect(sink.size).toBe(1)
    sink.reset()
    expect(sink.size).toBe(0)
    expect(sink.series().length).toBe(0)
  })

  it('gauge tracks latest value', () => {
    const sink = new InMemoryMetricSink()
    sink.record({ name: 'g', kind: 'gauge', value: 1, time: 't1', labels: {} })
    sink.record({ name: 'g', kind: 'gauge', value: 5, time: 't2', labels: {} })
    expect(sink.aggregate('g')).toEqual({ kind: 'gauge', latest: 5, updatedAt: 't2' })
  })
})
