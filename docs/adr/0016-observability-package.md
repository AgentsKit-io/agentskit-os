# ADR-0016 — Observability Package

- **Status:** Accepted
- **Date:** 2026-05-02
- **Deciders:** @EmersonBraun

## Context

AgentsKitOS already produces three durable signals — durable runs (`os-storage`), tamper-evident audit chains (`os-audit`), and per-run cost (`os-runtime` `CostTracker`). Live operational telemetry — what's happening *right now* — flows through `EventBus` (ADR-0005) but has no first-class subscriber surface.

Operators need three things from a live agent platform:

1. **Logs** — human-readable lines of every event.
2. **Traces** — span trees spanning runs, agents, tools, human gates.
3. **Metrics** — counters / gauges / histograms (event rate, error rate, tool latency, cost).

Without a dedicated package, every embedder hand-rolls subscribers and reinvents enum-string maps for span kinds, level mapping, and metric names.

## Decision

Create `@agentskit/os-observability` — pure decision-logic package that converts AgentsKitOS events into structured telemetry, with pluggable sinks for downstream backends.

Three primitives:

```ts
createLogSink(opts) → EventHandler          // structured log lines
createTraceCollector(opts) → EventHandler   // span tree builder
createMetricsRegistry(opts) → EventHandler  // counter/histogram registry
```

Each is a pure `EventHandler` (matches `os-core`'s `EventBus.subscribe` callback). Wire by `bus.subscribe('*', handler)`.

Sinks are pluggable adapters:

```ts
interface LogWriter   { write(line: LogLine): void | Promise<void> }
interface SpanExporter { export(span: Span): void | Promise<void> }
interface MetricSink   { record(point: MetricPoint): void | Promise<void> }
```

Built-in: `consoleLogWriter`, `inMemorySpanExporter`, `inMemoryMetricSink`. External sinks (OpenTelemetry, LangSmith, Grafana, Datadog) live in companion packages — `os-observability-otel`, etc.

## Rules

1. **No I/O in core**. Decision logic and primitive sinks only. Network/file IO lives in adapter packages or in the user-supplied `Writer`/`Exporter`/`MetricSink`.
2. **Push-only**. Subscribers consume; nothing in this package generates events.
3. **Lossy by design at sinks**. If a sink throws, the event is logged via `os-core`'s `onHandlerError` and dropped. Telemetry must never block agent execution.
4. **Span ids derived from event envelope**. `traceId = event.traceId ?? runId`, `spanId = event.spanId ?? nodeId`. No new id generation here — keeps trace correlation across audit, durable runs, and live telemetry one-to-one.
5. **Naming**. Log levels follow RFC-5424 (`debug`/`info`/`warn`/`error`). Metric names use snake_case. Span kinds match event types.
6. **No retroactive history**. Subscribing to the bus only sees events emitted *after* subscription. For replay, point the same handlers at audit-loaded events; the package exposes a `replayBatches(batches, handlers)` helper.

## Why a separate package

- ADR-0002 — `os-runtime` + `os-flow` stay free of telemetry concerns.
- Embedders who only need durable runs / audit don't pay for telemetry types.
- Independent release cadence — log/metric naming evolves slower than runtime.
- Test surface — telemetry semantics tested without spinning up a runtime.
- Future companion packages (`os-observability-otel`, `os-observability-grafana`, `os-observability-langsmith`) follow the same pattern.

## Consequences

- New package: `packages/os-observability`, distribution `public`, stability `alpha`.
- New peer dep on `@agentskit/os-core` (for `EventBus` + `AnyEvent`).
- Embedder docs gain a "wiring" page: 5 lines from `new InMemoryEventBus()` to streaming logs.
- Companion adapters land later as separate ADRs.

## Alternatives Considered

- **Inline subscribers in os-runtime / os-flow.** Rejected — bloats those packages with shape decisions that telemetry vendors will want to override.
- **Adopt OpenTelemetry SDK directly.** Rejected — heavyweight dep, opinionated vendor lock, and conflates contract (the data shape) with transport.
- **Piggyback on audit batches.** Rejected — audit chain is for tamper-evidence, not live telemetry; semantics differ (batched + signed vs. streaming + lossy).

## Open Questions

- [ ] Sampling: head-based (drop-on-publish) or tail-based (drop-on-export)?
- [ ] Span tree construction: real-time (streaming children to parents) or finalized-on-close?
- [ ] Metric reservoir: rolling window or per-export reset?
