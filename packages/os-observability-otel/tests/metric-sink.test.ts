import { describe, expect, it, vi } from 'vitest'
import type { MetricPoint } from '@agentskit/os-observability'
import {
  createOtelMetricSink,
  type OtelCounter,
  type OtelHistogram,
  type OtelMeterShape,
} from '../src/index.js'

type Call = { method: 'add' | 'record'; name: string; value: number; attrs?: Record<string, unknown> }

const fakeMeter = (): OtelMeterShape & { calls: Call[]; counters: number; histograms: number; updown: number } => {
  const calls: Call[] = []
  const meter = {
    calls,
    counters: 0,
    histograms: 0,
    updown: 0,
    createCounter: (name: string): OtelCounter => {
      meter.counters++
      return { add: (v, a) => calls.push({ method: 'add', name, value: v, attrs: a }) }
    },
    createHistogram: (name: string): OtelHistogram => {
      meter.histograms++
      return { record: (v, a) => calls.push({ method: 'record', name, value: v, attrs: a }) }
    },
    createUpDownCounter: (name: string): OtelCounter => {
      meter.updown++
      return { add: (v, a) => calls.push({ method: 'add', name, value: v, attrs: a }) }
    },
  }
  return meter
}

const point = (overrides: Partial<MetricPoint> = {}): MetricPoint => ({
  name: 'agentskitos_events_total',
  kind: 'counter',
  value: 1,
  time: '2026-05-02T17:00:00.000Z',
  labels: { workspace_id: 'team-a' },
  ...overrides,
})

describe('createOtelMetricSink', () => {
  it('records counter via Counter.add', () => {
    const meter = fakeMeter()
    const sink = createOtelMetricSink({ meter })
    sink.record(point())
    expect(meter.calls).toEqual([{ method: 'add', name: 'agentskitos_events_total', value: 1, attrs: { workspace_id: 'team-a' } }])
  })

  it('records histogram via Histogram.record', () => {
    const meter = fakeMeter()
    const sink = createOtelMetricSink({ meter })
    sink.record(point({ kind: 'histogram', name: 'dur', value: 50, unit: 'ms' }))
    expect(meter.calls[0]!.method).toBe('record')
    expect(meter.calls[0]!.value).toBe(50)
  })

  it('caches instruments by name (one create per name)', () => {
    const meter = fakeMeter()
    const sink = createOtelMetricSink({ meter })
    sink.record(point())
    sink.record(point())
    sink.record(point())
    expect(meter.counters).toBe(1)
  })

  it('different names create separate instruments', () => {
    const meter = fakeMeter()
    const sink = createOtelMetricSink({ meter })
    sink.record(point({ name: 'a' }))
    sink.record(point({ name: 'b' }))
    expect(meter.counters).toBe(2)
  })

  it('forwards unit option to instrument creation', () => {
    let captured: { name: string; unit?: string } | undefined
    const meter: OtelMeterShape = {
      createCounter: (name, opts) => {
        captured = { name, ...(opts?.unit !== undefined ? { unit: opts.unit } : {}) }
        return { add: () => undefined }
      },
      createHistogram: () => ({ record: () => undefined }),
      createUpDownCounter: () => ({ add: () => undefined }),
    }
    createOtelMetricSink({ meter }).record(point({ unit: 'USD' }))
    expect(captured?.unit).toBe('USD')
  })

  it('forwards meter throws to onError', () => {
    const onError = vi.fn()
    const meter: OtelMeterShape = {
      createCounter: () => ({ add: () => { throw new Error('boom') } }),
      createHistogram: () => ({ record: () => undefined }),
      createUpDownCounter: () => ({ add: () => undefined }),
    }
    const sink = createOtelMetricSink({ meter, onError })
    sink.record(point())
    expect(onError).toHaveBeenCalledOnce()
  })
})
