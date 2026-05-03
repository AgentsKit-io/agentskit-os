---
"@agentskit/os-observability": minor
---

Add metrics primitives — third leg of ADR-0016 (logs ✅ traces ✅ metrics ✅).

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
