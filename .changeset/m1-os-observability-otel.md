---
"@agentskit/os-observability-otel": minor
---

New package — OpenTelemetry binding for `@agentskit/os-observability`. Structural-typed adapters; bring-your-own OTel SDK. ADR-0016 companion.

Three adapters:

- `createOtelSpanExporter({ target, batchSize?, serviceName?, serviceVersion?, onError? })` — buffers `Span`s, batches up to `batchSize` (default 16), then calls `target.export(spans, cb)` matching the `@opentelemetry/sdk-trace-base.SpanExporter` shape. `flush()` and `shutdown()` exposed for orderly drains.
- `createOtelLogWriter({ logger, onError? })` — forwards each `LogLine` as an OTel `LogRecord` via `logger.emit`. Severity mapped per RFC-5424 (debug=5, info=9, warn=13, error=17). Trace + span + workspace + event ids land as attributes.
- `createOtelMetricSink({ meter, onError? })` — lazy instrument creation cached by name. Counters → `Counter.add`, histograms → `Histogram.record`. Unit propagated.

All three are structural-typed against OTel public shapes — no hard OTel dep, ESM/CJS-stable across OTel churn. `agentskitos.*` namespace used for OS-specific attributes (`kind`, `workspace_id`, `error.code`, `error.message`).

Distribution: `public`. Stability: `alpha`.
