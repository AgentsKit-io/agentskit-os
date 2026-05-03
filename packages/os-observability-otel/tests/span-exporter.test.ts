import { describe, expect, it, vi } from 'vitest'
import type { Span } from '@agentskit/os-observability'
import {
  createOtelSpanExporter,
  toOtelSpan,
  OTEL_SPAN_STATUS_OK,
  OTEL_SPAN_STATUS_ERROR,
  OTEL_SPAN_STATUS_UNSET,
  type OtelExportResult,
  type OtelReadableSpan,
  type OtelSpanExporterShape,
} from '../src/index.js'

const span = (overrides: Partial<Span> = {}): Span => ({
  traceId: 't1',
  spanId: 's1',
  kind: 'flow',
  name: 'flow.node.completed',
  workspaceId: 'team-a',
  startedAt: '2026-05-02T17:00:00.000Z',
  endedAt: '2026-05-02T17:00:01.250Z',
  durationMs: 1250,
  status: 'ok',
  attributes: { foo: 'bar' },
  ...overrides,
})

const fakeOtel = (): OtelSpanExporterShape & { batches: OtelReadableSpan[][]; shutdownCalled: boolean } => {
  const batches: OtelReadableSpan[][] = []
  return {
    batches,
    shutdownCalled: false,
    export(spans, cb) {
      batches.push([...spans])
      cb({ code: 0 })
    },
    async shutdown() {
      ;(this as unknown as { shutdownCalled: boolean }).shutdownCalled = true
    },
  }
}

describe('toOtelSpan', () => {
  it('maps required fields', () => {
    const s = toOtelSpan(span(), { name: 'svc' })
    expect(s.name).toBe('flow.node.completed')
    expect(s.spanContext().traceId).toBe('t1')
    expect(s.spanContext().spanId).toBe('s1')
    expect(s.attributes['agentskitos.kind']).toBe('flow')
    expect(s.attributes['agentskitos.workspace_id']).toBe('team-a')
    expect(s.attributes['foo']).toBe('bar')
    expect(s.status.code).toBe(OTEL_SPAN_STATUS_OK)
    expect(s.resource.attributes['service.name']).toBe('svc')
  })

  it('maps error status with code/message attributes', () => {
    const s = toOtelSpan(
      span({ status: 'error', errorCode: 'BAD', errorMessage: 'nope' }),
      { name: 'svc' },
    )
    expect(s.status.code).toBe(OTEL_SPAN_STATUS_ERROR)
    expect(s.attributes['agentskitos.error.code']).toBe('BAD')
    expect(s.attributes['agentskitos.error.message']).toBe('nope')
  })

  it('maps paused/skipped to UNSET with message', () => {
    expect(toOtelSpan(span({ status: 'paused' }), { name: 'svc' }).status.code).toBe(OTEL_SPAN_STATUS_UNSET)
    expect(toOtelSpan(span({ status: 'skipped' }), { name: 'svc' }).status.code).toBe(OTEL_SPAN_STATUS_UNSET)
  })

  it('parentSpanId carried through when present', () => {
    const s = toOtelSpan(span({ parentSpanId: 'p1' }), { name: 'svc' })
    expect(s.parentSpanId).toBe('p1')
  })

  it('parentSpanId omitted when absent', () => {
    const s = toOtelSpan(span(), { name: 'svc' })
    expect(s).not.toHaveProperty('parentSpanId')
  })

  it('hrTime conversion is [seconds, nanos]', () => {
    const s = toOtelSpan(span({ startedAt: '2026-05-02T17:00:00.500Z' }), { name: 'svc' })
    expect(s.startTime[1]).toBe(500_000_000)
  })

  it('hrTime [0,0] for invalid time', () => {
    const s = toOtelSpan(span({ startedAt: 'not-a-date' as never }), { name: 'svc' })
    expect(s.startTime).toEqual([0, 0])
  })

  it('includes service.version when provided', () => {
    const s = toOtelSpan(span(), { name: 'svc', version: '1.0.0' })
    expect(s.resource.attributes['service.version']).toBe('1.0.0')
  })

  it('omits service.version when absent', () => {
    const s = toOtelSpan(span(), { name: 'svc' })
    expect(s.resource.attributes).not.toHaveProperty('service.version')
  })
})

describe('createOtelSpanExporter', () => {
  it('buffers spans up to batchSize then flushes', async () => {
    const target = fakeOtel()
    const exp = createOtelSpanExporter({ target, batchSize: 3 })
    exp.export(span())
    exp.export(span({ spanId: 's2' }))
    expect(target.batches.length).toBe(0)
    exp.export(span({ spanId: 's3' }))
    await new Promise((r) => setTimeout(r, 5))
    expect(target.batches.length).toBe(1)
    expect(target.batches[0]!.length).toBe(3)
  })

  it('flush() drains buffer immediately', async () => {
    const target = fakeOtel()
    const exp = createOtelSpanExporter({ target, batchSize: 100 })
    exp.export(span())
    await exp.flush()
    expect(target.batches.length).toBe(1)
  })

  it('flush() is no-op when buffer empty', async () => {
    const target = fakeOtel()
    const exp = createOtelSpanExporter({ target })
    await exp.flush()
    expect(target.batches.length).toBe(0)
  })

  it('shutdown() proxies to target', async () => {
    const target = fakeOtel()
    const exp = createOtelSpanExporter({ target })
    await exp.shutdown()
    expect(target.shutdownCalled).toBe(true)
  })

  it('forwards target export errors via onError', async () => {
    const onError = vi.fn()
    const target: OtelSpanExporterShape = {
      export: (_s, cb) => cb({ code: 1, error: new Error('boom') } as OtelExportResult),
      shutdown: async () => undefined,
    }
    const exp = createOtelSpanExporter({ target, batchSize: 1, onError })
    exp.export(span())
    await new Promise((r) => setTimeout(r, 5))
    expect(onError).toHaveBeenCalledOnce()
  })

  it('catches synchronous throws from target.export', async () => {
    const onError = vi.fn()
    const target: OtelSpanExporterShape = {
      export: () => { throw new Error('sync') },
      shutdown: async () => undefined,
    }
    const exp = createOtelSpanExporter({ target, batchSize: 1, onError })
    exp.export(span())
    await new Promise((r) => setTimeout(r, 5))
    expect(onError).toHaveBeenCalledOnce()
  })

  it('honors serviceName / serviceVersion options', async () => {
    const target = fakeOtel()
    const exp = createOtelSpanExporter({ target, serviceName: 'myapp', serviceVersion: '2.0', batchSize: 1 })
    exp.export(span())
    await new Promise((r) => setTimeout(r, 5))
    const out = target.batches[0]![0]!
    expect(out.resource.attributes['service.name']).toBe('myapp')
    expect(out.resource.attributes['service.version']).toBe('2.0')
  })
})
