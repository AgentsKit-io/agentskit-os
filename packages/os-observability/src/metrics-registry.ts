// ADR-0016 — pure event-to-metric decision logic. Pluggable MetricSink.
// EventHandler shape matches os-core's EventBus.subscribe callback.
//
// Three metric kinds emitted:
// - counter: per-event-type rolling count (workspace + type label)
// - histogram: span/run duration in ms (when event.data.durationMs present)
// - counter: cost in USD micro-units (when event.data.costUsd present)
//
// Lossy at the sink: throws flow to onError, never bubble.

import type { AnyEvent, EventHandler } from '@agentskit/os-core'

export type MetricKind = 'counter' | 'histogram' | 'gauge'

export type MetricPoint = {
  readonly name: string
  readonly kind: MetricKind
  readonly value: number
  readonly time: string
  readonly unit?: string
  readonly labels: Record<string, string>
}

export interface MetricSink {
  record(point: MetricPoint): void | Promise<void>
}

export type MetricRule = {
  readonly name: string
  readonly kind: MetricKind
  readonly value: (event: AnyEvent) => number | undefined
  readonly unit?: string
  readonly labels?: (event: AnyEvent) => Record<string, string>
}

export type MetricsRegistryOptions = {
  readonly sink: MetricSink
  readonly rules?: readonly MetricRule[]
  readonly onError?: (err: unknown, event: AnyEvent, rule: MetricRule) => void
}

const numField = (event: AnyEvent, key: string): number | undefined => {
  const data = event.data as Record<string, unknown> | undefined
  if (!data) return undefined
  const v = data[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

const baseLabels = (event: AnyEvent): Record<string, string> => ({
  workspace_id: event.workspaceId,
  type: event.type,
})

export const eventCountRule: MetricRule = {
  name: 'agentskitos_events_total',
  kind: 'counter',
  value: () => 1,
  labels: baseLabels,
}

export const durationRule: MetricRule = {
  name: 'agentskitos_node_duration_ms',
  kind: 'histogram',
  unit: 'ms',
  value: (e) => numField(e, 'durationMs'),
  labels: baseLabels,
}

export const costRule: MetricRule = {
  name: 'agentskitos_run_cost_usd',
  kind: 'counter',
  unit: 'USD',
  value: (e) => numField(e, 'costUsd'),
  labels: baseLabels,
}

export const DEFAULT_METRIC_RULES: readonly MetricRule[] = [
  eventCountRule,
  durationRule,
  costRule,
]

export const createMetricsRegistry = (opts: MetricsRegistryOptions): EventHandler => {
  const rules = opts.rules ?? DEFAULT_METRIC_RULES
  const onError = opts.onError ?? (() => undefined)
  return async (event) => {
    for (const rule of rules) {
      const v = rule.value(event)
      if (v === undefined) continue
      const labels = rule.labels ? rule.labels(event) : baseLabels(event)
      const point: MetricPoint = {
        name: rule.name,
        kind: rule.kind,
        value: v,
        time: event.time,
        ...(rule.unit !== undefined ? { unit: rule.unit } : {}),
        labels,
      }
      try {
        await opts.sink.record(point)
      } catch (e) {
        onError(e, event, rule)
      }
    }
  }
}
