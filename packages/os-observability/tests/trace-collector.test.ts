import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus } from '@agentskit/os-core'
import {
  InMemorySpanExporter,
  createTraceCollector,
  defaultClassifyLifecycle,
  defaultKindOf,
  type Span,
  type SpanExporter,
} from '../src/index.js'
import { fakeEvent } from './_helpers.js'

describe('defaultClassifyLifecycle', () => {
  it('returns "start" for *.started / *.created', () => {
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'flow.node.started' }))).toBe('start')
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'run.created' }))).toBe('start')
  })

  it('returns end variants', () => {
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'flow.node.completed' }))).toBe('end:ok')
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'flow.node.failed' }))).toBe('end:error')
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'flow.node.skipped' }))).toBe('end:skipped')
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'flow.node.paused' }))).toBe('end:paused')
  })

  it('returns undefined for non-lifecycle events', () => {
    expect(defaultClassifyLifecycle(fakeEvent({ type: 'agent.heartbeat' }))).toBeUndefined()
  })
})

describe('defaultKindOf', () => {
  it.each([
    ['flow.node.started', 'flow'],
    ['agent.task.completed', 'agent'],
    ['tool.invoked', 'tool'],
    ['human.review.requested', 'human'],
    ['random.event', 'unknown'],
  ])('classifies %s as %s', (type, kind) => {
    expect(defaultKindOf(fakeEvent({ type }))).toBe(kind)
  })
})

describe('createTraceCollector', () => {
  it('emits one Span per start+end pair', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't1', spanId: 's1', time: '2026-05-02T17:00:00.000Z' }))
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't1', spanId: 's1', time: '2026-05-02T17:00:01.500Z' }))
    expect(exporter.size).toBe(1)
    const span = exporter.all()[0]!
    expect(span.status).toBe('ok')
    expect(span.durationMs).toBe(1500)
    expect(span.kind).toBe('flow')
  })

  it('marks failed span with errorCode + errorMessage from event data', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 's' }))
    await collect(fakeEvent({
      type: 'flow.node.failed',
      traceId: 't',
      spanId: 's',
      data: { errorCode: 'TOOL_NOT_FOUND', errorMessage: 'unknown tool: x' },
    }))
    const span = exporter.all()[0]!
    expect(span.status).toBe('error')
    expect(span.errorCode).toBe('TOOL_NOT_FOUND')
    expect(span.errorMessage).toBe('unknown tool: x')
  })

  it('captures parentSpanId from start event data', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({
      type: 'tool.started',
      traceId: 't',
      spanId: 's2',
      data: { parentSpanId: 's1' },
    }))
    await collect(fakeEvent({ type: 'tool.completed', traceId: 't', spanId: 's2' }))
    expect(exporter.all()[0]!.parentSpanId).toBe('s1')
  })

  it('ignores end events with no matching open span', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 's' }))
    expect(exporter.size).toBe(0)
  })

  it('skips events with no traceId or spanId', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: undefined, spanId: 's' }) as never)
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: undefined }) as never)
    expect(exporter.size).toBe(0)
  })

  it('isolates spans by traceId+spanId tuple', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't1', spanId: 's' }))
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't2', spanId: 's' }))
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't1', spanId: 's' }))
    expect(exporter.size).toBe(1)
    expect(exporter.all()[0]!.traceId).toBe('t1')
  })

  it('forTrace returns only matching spans', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    for (const trace of ['a', 'b', 'a']) {
      const sId = `${trace}-s`
      await collect(fakeEvent({ type: 'flow.node.started', traceId: trace, spanId: sId }))
      await collect(fakeEvent({ type: 'flow.node.completed', traceId: trace, spanId: sId }))
    }
    expect(exporter.forTrace('a').length).toBe(2)
    expect(exporter.forTrace('b').length).toBe(1)
  })

  it('merges start + end attributes into span.attributes', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'tool.started', traceId: 't', spanId: 's', data: { tool: 'echo' } }))
    await collect(fakeEvent({ type: 'tool.completed', traceId: 't', spanId: 's', data: { result: 42 } }))
    expect(exporter.all()[0]!.attributes).toEqual({ tool: 'echo', result: 42 })
  })

  it('clamps negative duration to 0 if events arrive out of order', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 's', time: '2026-05-02T17:00:01.000Z' }))
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 's', time: '2026-05-02T17:00:00.000Z' }))
    expect(exporter.all()[0]!.durationMs).toBe(0)
  })

  it('forwards exporter throws to onError sink (does not bubble)', async () => {
    const onError = vi.fn()
    const broken: SpanExporter = { export: () => { throw new Error('boom') } }
    const collect = createTraceCollector({ exporter: broken, onError })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 's' }))
    await expect(collect(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 's' }))).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('honors classify / kindOf / nameOf overrides', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({
      exporter,
      classify: (e) => (e.type === 'x' ? 'start' : e.type === 'y' ? 'end:ok' : undefined),
      kindOf: () => 'agent',
      nameOf: () => 'forced',
    })
    await collect(fakeEvent({ type: 'x', traceId: 't', spanId: 's' }))
    await collect(fakeEvent({ type: 'y', traceId: 't', spanId: 's' }))
    const span = exporter.all()[0]!
    expect(span.kind).toBe('agent')
    expect(span.name).toBe('forced')
  })

  it('integrates with InMemoryEventBus.subscribe', async () => {
    const bus = new InMemoryEventBus()
    const exporter = new InMemorySpanExporter()
    bus.subscribe('*', createTraceCollector({ exporter }))
    await bus.publish(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 's' }))
    await bus.publish(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 's' }))
    expect(exporter.size).toBe(1)
  })

  it('reset clears exporter buffer', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 's' }))
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 's' }))
    expect(exporter.size).toBe(1)
    exporter.reset()
    expect(exporter.size).toBe(0)
  })

  it('produces a flat list that reconstructs into a parent tree', async () => {
    const exporter = new InMemorySpanExporter()
    const collect = createTraceCollector({ exporter })
    await collect(fakeEvent({ type: 'flow.node.started', traceId: 't', spanId: 'root' }))
    await collect(fakeEvent({ type: 'tool.started', traceId: 't', spanId: 'child', data: { parentSpanId: 'root' } }))
    await collect(fakeEvent({ type: 'tool.completed', traceId: 't', spanId: 'child' }))
    await collect(fakeEvent({ type: 'flow.node.completed', traceId: 't', spanId: 'root' }))
    const spans = exporter.forTrace('t')
    const root = spans.find((s: Span) => s.spanId === 'root')!
    const child = spans.find((s: Span) => s.spanId === 'child')!
    expect(root.parentSpanId).toBeUndefined()
    expect(child.parentSpanId).toBe('root')
  })
})
