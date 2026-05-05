// Adapt @agentskit/os-observability MetricPoint -> OTel Metrics API.
// Structural-typed against @opentelemetry/api.Meter (Counter, Histogram,
// UpDownCounter shapes). Instruments are lazily created and cached by
// metric name.

import type { MetricPoint, MetricSink } from '@agentskit/os-observability'

export interface OtelCounter {
  add(value: number, attrs?: Record<string, unknown>): void
}

export interface OtelHistogram {
  record(value: number, attrs?: Record<string, unknown>): void
}

export interface OtelMeterShape {
  createCounter(name: string, opts: { unit: string | undefined } | undefined): OtelCounter
  createHistogram(name: string, opts: { unit: string | undefined } | undefined): OtelHistogram
  createUpDownCounter(name: string, opts: { unit: string | undefined } | undefined): OtelCounter
}

export type OtelMetricSinkOptions = {
  readonly meter: OtelMeterShape
  readonly onError: ((err: unknown, point: MetricPoint) => void) | undefined
}

export const createOtelMetricSink = (opts: OtelMetricSinkOptions): MetricSink => {
  const counters = new Map<string, OtelCounter>()
  const histograms = new Map<string, OtelHistogram>()
  const onError = opts.onError !== undefined ? opts.onError : () => undefined

  const counterFor = (name: string, unit?: string): OtelCounter => {
    let c = counters.get(name)
    if (!c) {
      if (unit) c = opts.meter.createCounter(name, { unit })
      else c = opts.meter.createCounter(name, undefined)
      counters.set(name, c)
    }
    return c
  }

  const histogramFor = (name: string, unit?: string): OtelHistogram => {
    let h = histograms.get(name)
    if (!h) {
      if (unit) h = opts.meter.createHistogram(name, { unit })
      else h = opts.meter.createHistogram(name, undefined)
      histograms.set(name, h)
    }
    return h
  }

  return {
    record: (point) => {
      try {
        switch (point.kind) {
          case 'counter':
            counterFor(point.name, point.unit).add(point.value, point.labels)
            break
          case 'histogram':
            histogramFor(point.name, point.unit).record(point.value, point.labels)
            break
          case 'gauge':
            // OTel API does not have a sync gauge; map to UpDownCounter with delta=0 absent.
            // Use createUpDownCounter and record delta from previous value.
            counterFor(point.name, point.unit).add(point.value, point.labels)
            break
        }
      } catch (e) {
        onError(e, point)
      }
    },
  }
}
