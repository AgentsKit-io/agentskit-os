---
"@agentskit/os-observability": minor
---

Add cost-to-metrics bridge — converts `os-runtime`'s `CostEntry` shape into `MetricPoint`s for any `MetricSink`.

- `costEntryToMetricPoints(entry, labels?)` — pure factory. Always emits `agentskitos_run_cost_usd` (counter, USD); also emits `agentskitos_llm_input_tokens` and `agentskitos_llm_output_tokens` counters when those fields are present.
- `createCostMetricsRecorder({ sink, workspaceId?, extra?, onError? })` → `(entry, runId?) => Promise<void>`. Threads `runId`/`workspaceId` into the label set. Lossy at the sink: thrown errors flow to `onError`.

Structural-typed against `CostEntry` so the bridge stays free of an `os-runtime` peer dep — keeps observability light per ADR-0016.

Default labels: `workspace_id`, `run_id`, `system`, `model`, `node_id` (when present). Caller-supplied `extra` merges last and can override.

10 new tests.
