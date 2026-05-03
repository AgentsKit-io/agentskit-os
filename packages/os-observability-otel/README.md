# @agentskit/os-observability-otel

> OpenTelemetry binding for `@agentskit/os-observability`. Pure structural-typed adapters; bring your own OTel SDK.

**Distribution:** `public` · **Stability:** `alpha`

## Surface

- `createOtelSpanExporter({ target, batchSize?, serviceName?, onError? })` — adapts AgentsKitOS `Span` → OTel `ReadableSpan` and forwards to a target SDK exporter.
- `createOtelLogWriter({ logger, onError? })` — adapts `LogLine` → OTel `LogRecord` via `Logger.emit`.
- `createOtelMetricSink({ meter, onError? })` — adapts `MetricPoint` → OTel `Counter` / `Histogram` instrument calls.

All three are structural-typed against the OTel SDK shape — embedders pass any concrete OTel exporter / logger / meter.

## Why structural

OTel SDK is heavy, ESM/CJS dual-format-fragile, and frequently breaks across minor versions. By depending only on the public shape we keep `os-observability-otel` build-stable across OTel churn while still snapping cleanly into a real OTel pipeline.
