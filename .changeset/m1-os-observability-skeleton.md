---
"@agentskit/os-observability": minor
---

New package — pure decision logic converting AgentsKitOS events into structured telemetry. Pluggable sinks. ADR-0016.

Initial scaffold ships log primitives:

- `createLogSink({ writer, minLevel?, classify?, format?, extract? })` — `EventHandler` matching `os-core`'s `EventBus.subscribe` callback. Wires with `bus.subscribe('*', sink)`.
- Default classifier: `*.failed`/`*.error`/`*.rejected → error`, `*.paused`/`*.skipped`/`*.degraded → warn`, `*.started`/`*.created → debug`, otherwise `info`.
- Default format: `event.data.message ?? event.type`.
- `traceId` / `spanId` / `workspaceId` forwarded straight from event envelope — keeps trace correlation across audit, durable runs, and live telemetry one-to-one.
- `consoleLogWriter({ console?, stringify? })` — default `LogWriter`. Routes per-level to matching console method.
- `replayEvents(events, handlers)` — feed historical events (e.g. loaded from audit batches) through any handler chain.

Distribution: `public`. Stability: `alpha`. Trace + metric primitives + companion OTel package follow.
