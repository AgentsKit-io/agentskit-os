---
"@agentskit/os-observability": minor
---

Add trace primitives — span tree builder driven by node lifecycle events on the EventBus.

- `createTraceCollector({ exporter, classify?, kindOf?, nameOf?, onError? })` — pure `EventHandler`. Tracks open spans by `traceId`+`spanId`, emits a finished `Span` to the exporter on `*.completed` / `*.failed` / `*.skipped` / `*.paused` / `*.resumed`. Lossy at the exporter — thrown errors flow to `onError` and never bubble to the bus.
- `defaultClassifyLifecycle` — `*.started`/`*.created → start`, `*.completed`/`*.resumed → end:ok`, `*.failed`/`*.error`/`*.rejected → end:error`, `*.skipped → end:skipped`, `*.paused → end:paused`.
- `defaultKindOf` — prefix-based: `flow.* → flow`, `agent.* → agent`, `tool.* → tool`, `human.* → human`, else `unknown`.
- `parentSpanId` honored from `event.data.parentSpanId` on start events — flat span list reconstructs into a tree.
- `attributes` merge data from start + end events.
- `durationMs` clamped to ≥ 0 if events arrive out of order.
- `errorCode` / `errorMessage` extracted from `event.data` on error end.

Reference exporter: `InMemorySpanExporter` — collects spans in-process for tests / inspection (`all()`, `forTrace(traceId)`, `reset()`, `size`). Real backends (OTel, LangSmith) live in companion packages.

22 new tests.
