// End-to-end: os-flow's bus-bridge publishes envelopes onto an EventBus;
// log + trace + metrics handlers all subscribe and consume the same
// stream. Locks the wire shape produced by os-flow against the shape
// expected by os-observability.

import { describe, expect, it } from 'vitest'
import { InMemoryEventBus, parseRunContext } from '@agentskit/os-core'
import { createBusOnEvent } from '@agentskit/os-flow'
import {
  InMemoryMetricSink,
  InMemorySpanExporter,
  createLogSink,
  createMetricsRegistry,
  createTraceCollector,
  type LogLine,
  type LogWriter,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_e2e',
  startedAt: '2026-05-02T17:00:00.000Z',
})

const collector = (): LogWriter & { lines: LogLine[] } => {
  const lines: LogLine[] = []
  return { lines, write: (l) => { lines.push(l) } }
}

describe('end-to-end: bus-bridge → bus → log + trace + metrics', () => {
  it('every flow event reaches every subscribed handler', async () => {
    const bus = new InMemoryEventBus()

    const logs = collector()
    const exporter = new InMemorySpanExporter()
    const sink = new InMemoryMetricSink()

    bus.subscribe('*', createLogSink({ writer: logs }))
    bus.subscribe('*', createTraceCollector({ exporter }))
    bus.subscribe('*', createMetricsRegistry({ sink }))

    const onEvent = createBusOnEvent({ bus, ctx, now: () => '2026-05-02T17:00:01.000Z' })
    await onEvent({ kind: 'node:start', nodeId: 'a' })
    await onEvent({ kind: 'node:end', nodeId: 'a', outcome: { kind: 'ok', value: 42 } })
    await onEvent({ kind: 'node:start', nodeId: 'b' })
    await onEvent({
      kind: 'node:end',
      nodeId: 'b',
      outcome: { kind: 'failed', error: { code: 'TOOL_NOT_FOUND', message: 'missing' } },
    })

    // 4 events × 3 handlers
    expect(logs.lines.length).toBe(4)
    expect(logs.lines.map((l) => l.level)).toEqual(['debug', 'info', 'debug', 'error'])

    expect(exporter.size).toBe(2)
    expect(exporter.all().map((s) => s.status)).toEqual(['ok', 'error'])

    // metrics registry emits at least the events_total counter (4 records)
    expect(sink.byName('agentskitos_events_total').length).toBe(4)
  })

  it('error event surfaces TOOL_NOT_FOUND across all three handlers', async () => {
    const bus = new InMemoryEventBus()
    const logs = collector()
    const exporter = new InMemorySpanExporter()
    const sink = new InMemoryMetricSink()

    bus.subscribe('*', createLogSink({ writer: logs }))
    bus.subscribe('*', createTraceCollector({ exporter }))
    bus.subscribe('*', createMetricsRegistry({ sink }))

    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({ kind: 'node:start', nodeId: 'b' })
    await onEvent({
      kind: 'node:end',
      nodeId: 'b',
      outcome: { kind: 'failed', error: { code: 'TOOL_NOT_FOUND', message: 'missing tool' } },
    })

    expect(logs.lines[1]!.level).toBe('error')
    expect(logs.lines[1]!.fields['errorCode']).toBe('TOOL_NOT_FOUND')

    const span = exporter.all()[0]!
    expect(span.errorCode).toBe('TOOL_NOT_FOUND')
    expect(span.errorMessage).toBe('missing tool')

    // metrics: cost / duration not populated by bus-bridge today, but
    // event count must include both.
    expect(sink.byName('agentskitos_events_total').length).toBe(2)
  })

  it('trace correlation: traceId = runId, spanId = nodeId', async () => {
    const bus = new InMemoryEventBus()
    const exporter = new InMemorySpanExporter()
    bus.subscribe('*', createTraceCollector({ exporter }))

    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({ kind: 'node:start', nodeId: 'root' })
    await onEvent({ kind: 'node:end', nodeId: 'root', outcome: { kind: 'ok', value: 'x' } })

    const span = exporter.all()[0]!
    expect(span.traceId).toBe('run_e2e')
    expect(span.spanId).toBe('root')
    expect(span.workspaceId).toBe('team-a')
  })

  it('paused outcome → warn log + paused span status', async () => {
    const bus = new InMemoryEventBus()
    const logs = collector()
    const exporter = new InMemorySpanExporter()
    bus.subscribe('*', createLogSink({ writer: logs }))
    bus.subscribe('*', createTraceCollector({ exporter }))

    const onEvent = createBusOnEvent({ bus, ctx })
    await onEvent({ kind: 'node:start', nodeId: 'h' })
    await onEvent({
      kind: 'node:end',
      nodeId: 'h',
      outcome: { kind: 'paused', reason: 'awaiting human' },
    })

    expect(logs.lines[1]!.level).toBe('warn')
    expect(exporter.all()[0]!.status).toBe('paused')
  })
})
