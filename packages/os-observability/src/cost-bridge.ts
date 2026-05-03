// Bridge — convert os-runtime CostEntry into MetricPoints. Structural-
// typed against CostEntry so this file stays free of an os-runtime peer
// dep (keeps observability light per ADR-0016).
//
// Three points per entry:
//   - agentskitos_run_cost_usd      counter (USD)
//   - agentskitos_llm_input_tokens  counter
//   - agentskitos_llm_output_tokens counter

import type { MetricPoint, MetricSink } from './metrics-registry.js'

export type CostEntryShape = {
  readonly system: string
  readonly model: string
  readonly costUsd: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly recordedAt: string
  readonly nodeId?: string
}

export type CostBridgeLabels = {
  readonly runId?: string
  readonly workspaceId?: string
  readonly extra?: Record<string, string>
}

const baseLabels = (entry: CostEntryShape, labels: CostBridgeLabels): Record<string, string> => ({
  ...(labels.workspaceId ? { workspace_id: labels.workspaceId } : {}),
  ...(labels.runId ? { run_id: labels.runId } : {}),
  system: entry.system,
  model: entry.model,
  ...(entry.nodeId ? { node_id: entry.nodeId } : {}),
  ...(labels.extra ?? {}),
})

export const costEntryToMetricPoints = (
  entry: CostEntryShape,
  labels: CostBridgeLabels = {},
): readonly MetricPoint[] => {
  const labelSet = baseLabels(entry, labels)
  const out: MetricPoint[] = [
    {
      name: 'agentskitos_run_cost_usd',
      kind: 'counter',
      value: entry.costUsd,
      time: entry.recordedAt,
      unit: 'USD',
      labels: labelSet,
    },
  ]
  if (entry.inputTokens !== undefined) {
    out.push({
      name: 'agentskitos_llm_input_tokens',
      kind: 'counter',
      value: entry.inputTokens,
      time: entry.recordedAt,
      labels: labelSet,
    })
  }
  if (entry.outputTokens !== undefined) {
    out.push({
      name: 'agentskitos_llm_output_tokens',
      kind: 'counter',
      value: entry.outputTokens,
      time: entry.recordedAt,
      labels: labelSet,
    })
  }
  return out
}

export type CostMetricsRecorderOptions = {
  readonly sink: MetricSink
  readonly workspaceId?: string
  readonly extra?: Record<string, string>
  readonly onError?: (err: unknown, entry: CostEntryShape) => void
}

export const createCostMetricsRecorder = (
  opts: CostMetricsRecorderOptions,
): ((entry: CostEntryShape, runId?: string) => Promise<void>) => {
  const onError = opts.onError ?? (() => undefined)
  return async (entry, runId) => {
    const labels: CostBridgeLabels = {
      ...(opts.workspaceId !== undefined ? { workspaceId: opts.workspaceId } : {}),
      ...(runId !== undefined ? { runId } : {}),
      ...(opts.extra !== undefined ? { extra: opts.extra } : {}),
    }
    const points = costEntryToMetricPoints(entry, labels)
    for (const p of points) {
      try {
        await opts.sink.record(p)
      } catch (e) {
        onError(e, entry)
      }
    }
  }
}
