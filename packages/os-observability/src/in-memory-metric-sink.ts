// Reference MetricSink — collects raw points + maintains aggregates.
// Counters sum; histograms keep raw samples for downstream percentile
// calculation; gauges track latest value.

import type { MetricKind, MetricPoint, MetricSink } from './metrics-registry.js'

export type CounterAgg = { kind: 'counter'; sum: number; count: number }
export type GaugeAgg = { kind: 'gauge'; latest: number; updatedAt: string }
export type HistogramAgg = {
  kind: 'histogram'
  count: number
  sum: number
  min: number
  max: number
  samples: readonly number[]
}
export type Agg = CounterAgg | GaugeAgg | HistogramAgg

const labelKey = (labels: Record<string, string>): string =>
  Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',')

const seriesKey = (name: string, labels: Record<string, string>): string =>
  `${name}|${labelKey(labels)}`

export class InMemoryMetricSink implements MetricSink {
  private readonly points: MetricPoint[] = []
  private readonly aggs = new Map<string, Agg>()

  record(point: MetricPoint): void {
    this.points.push(point)
    const key = seriesKey(point.name, point.labels)
    const existing = this.aggs.get(key)
    this.aggs.set(key, this.fold(existing, point))
  }

  private fold(prev: Agg | undefined, p: MetricPoint): Agg {
    switch (p.kind) {
      case 'counter': {
        const c = (prev?.kind === 'counter' ? prev : { kind: 'counter' as const, sum: 0, count: 0 })
        return { kind: 'counter', sum: c.sum + p.value, count: c.count + 1 }
      }
      case 'gauge':
        return { kind: 'gauge', latest: p.value, updatedAt: p.time }
      case 'histogram': {
        const h =
          prev?.kind === 'histogram'
            ? prev
            : { kind: 'histogram' as const, count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, samples: [] as number[] }
        const samples = [...h.samples, p.value]
        return {
          kind: 'histogram',
          count: h.count + 1,
          sum: h.sum + p.value,
          min: Math.min(h.min, p.value),
          max: Math.max(h.max, p.value),
          samples,
        }
      }
    }
  }

  all(): readonly MetricPoint[] {
    return this.points.slice()
  }

  byName(name: string): readonly MetricPoint[] {
    return this.points.filter((p) => p.name === name)
  }

  aggregate(name: string, labels: Record<string, string> = {}): Agg | undefined {
    return this.aggs.get(seriesKey(name, labels))
  }

  series(): readonly { name: string; labels: Record<string, string>; agg: Agg }[] {
    return [...this.aggs.entries()].map(([key, agg]) => {
      const [name, labelStr] = key.split('|')
      const labels: Record<string, string> = {}
      if (labelStr) {
        for (const part of labelStr.split(',')) {
          const eq = part.indexOf('=')
          if (eq > 0) labels[part.slice(0, eq)] = part.slice(eq + 1)
        }
      }
      return { name: name ?? '', labels, agg }
    })
  }

  reset(): void {
    this.points.length = 0
    this.aggs.clear()
  }

  get size(): number {
    return this.points.length
  }

  // expose for tests / introspection
  kindsSeen(): readonly MetricKind[] {
    return [...new Set(this.points.map((p) => p.kind))]
  }
}
