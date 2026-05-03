# @agentskit/os-observability

## 1.0.0-alpha.0

### Minor Changes

- fb28506: Add cost-to-metrics bridge — converts `os-runtime`'s `CostEntry` shape into `MetricPoint`s for any `MetricSink`.

  - `costEntryToMetricPoints(entry, labels?)` — pure factory. Always emits `agentskitos_run_cost_usd` (counter, USD); also emits `agentskitos_llm_input_tokens` and `agentskitos_llm_output_tokens` counters when those fields are present.
  - `createCostMetricsRecorder({ sink, workspaceId?, extra?, onError? })` → `(entry, runId?) => Promise<void>`. Threads `runId`/`workspaceId` into the label set. Lossy at the sink: thrown errors flow to `onError`.

  Structural-typed against `CostEntry` so the bridge stays free of an `os-runtime` peer dep — keeps observability light per ADR-0016.

  Default labels: `workspace_id`, `run_id`, `system`, `model`, `node_id` (when present). Caller-supplied `extra` merges last and can override.

  10 new tests.

- c30871c: Add metrics primitives — third leg of ADR-0016 (logs ✅ traces ✅ metrics ✅).

  `createMetricsRegistry({ sink, rules?, onError? })` — pure `EventHandler` matching `os-core`'s `EventBus.subscribe` callback. Walks a list of `MetricRule`s per event; rules whose `value()` returns `undefined` are skipped. Lossy at the sink: thrown errors flow to `onError`.

  Default rules:

  - `agentskitos_events_total` — counter, fires once per event. Labels: `workspace_id`, `type`.
  - `agentskitos_node_duration_ms` — histogram (unit `ms`), reads numeric `event.data.durationMs`.
  - `agentskitos_run_cost_usd` — counter (unit `USD`), reads numeric `event.data.costUsd`.

  Numeric extraction rejects `NaN` / `Infinity` / non-numbers — bad data is dropped silently rather than corrupting series.

  `InMemoryMetricSink` — reference sink. Stores raw `MetricPoint`s plus per-series aggregates:

  - `CounterAgg` { sum, count }
  - `GaugeAgg` { latest, updatedAt }
  - `HistogramAgg` { count, sum, min, max, samples } — raw samples kept for downstream percentile calc.

  Series are keyed by name + sorted-label tuple. Helpers: `all()`, `byName(name)`, `aggregate(name, labels?)`, `series()`, `reset()`, `size`.

  OTel companion package follows.

  18 new tests.

- 1c6e75a: New package — pure decision logic converting AgentsKitOS events into structured telemetry. Pluggable sinks. ADR-0016.

  Initial scaffold ships log primitives:

  - `createLogSink({ writer, minLevel?, classify?, format?, extract? })` — `EventHandler` matching `os-core`'s `EventBus.subscribe` callback. Wires with `bus.subscribe('*', sink)`.
  - Default classifier: `*.failed`/`*.error`/`*.rejected → error`, `*.paused`/`*.skipped`/`*.degraded → warn`, `*.started`/`*.created → debug`, otherwise `info`.
  - Default format: `event.data.message ?? event.type`.
  - `traceId` / `spanId` / `workspaceId` forwarded straight from event envelope — keeps trace correlation across audit, durable runs, and live telemetry one-to-one.
  - `consoleLogWriter({ console?, stringify? })` — default `LogWriter`. Routes per-level to matching console method.
  - `replayEvents(events, handlers)` — feed historical events (e.g. loaded from audit batches) through any handler chain.

  Distribution: `public`. Stability: `alpha`. Trace + metric primitives + companion OTel package follow.

- 6da2eac: Add trace primitives — span tree builder driven by node lifecycle events on the EventBus.

  - `createTraceCollector({ exporter, classify?, kindOf?, nameOf?, onError? })` — pure `EventHandler`. Tracks open spans by `traceId`+`spanId`, emits a finished `Span` to the exporter on `*.completed` / `*.failed` / `*.skipped` / `*.paused` / `*.resumed`. Lossy at the exporter — thrown errors flow to `onError` and never bubble to the bus.
  - `defaultClassifyLifecycle` — `*.started`/`*.created → start`, `*.completed`/`*.resumed → end:ok`, `*.failed`/`*.error`/`*.rejected → end:error`, `*.skipped → end:skipped`, `*.paused → end:paused`.
  - `defaultKindOf` — prefix-based: `flow.* → flow`, `agent.* → agent`, `tool.* → tool`, `human.* → human`, else `unknown`.
  - `parentSpanId` honored from `event.data.parentSpanId` on start events — flat span list reconstructs into a tree.
  - `attributes` merge data from start + end events.
  - `durationMs` clamped to ≥ 0 if events arrive out of order.
  - `errorCode` / `errorMessage` extracted from `event.data` on error end.

  Reference exporter: `InMemorySpanExporter` — collects spans in-process for tests / inspection (`all()`, `forTrace(traceId)`, `reset()`, `size`). Real backends (OTel, LangSmith) live in companion packages.

  22 new tests.

### Patch Changes

- 91e399c: Add end-to-end integration tests — `os-flow`'s `createBusOnEvent` publishes envelopes onto an `InMemoryEventBus`; log + trace + metrics handlers all subscribe and consume the same stream. Locks the wire shape produced by `os-flow` against the shape expected by `os-observability` so future drift in either side surfaces immediately.

  Coverage:

  - Every flow event reaches every subscribed handler (log/trace/metrics counts match)
  - Error event (`{ kind: 'failed', error: { code, message } }`) surfaces `TOOL_NOT_FOUND` consistently as log fields, span `errorCode`/`errorMessage`, and metric increment
  - Trace correlation: `traceId = runId`, `spanId = nodeId`, `workspaceId` propagated
  - Paused outcome → warn log + `paused` span status

  `@agentskit/os-flow` + `@agentskit/os-audit` added as devDeps for the test fixtures.

  4 new tests.

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
