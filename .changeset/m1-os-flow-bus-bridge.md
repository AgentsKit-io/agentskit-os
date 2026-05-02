---
"@agentskit/os-flow": minor
---

Add `createBusOnEvent` bridge — converts flow `onEvent` callbacks into OS events (ADR-0005) on an `EventBus`. Ties durable runs to the audit chain end-to-end.

Six event types exposed via `FLOW_EVENT_TYPES`:

- `flow.node.started`
- `flow.node.completed` (ok outcome, with `value`)
- `flow.node.failed` (with `errorCode` + `errorMessage`)
- `flow.node.paused` (with `pauseReason`)
- `flow.node.skipped` (with `skipReason`)
- `flow.node.resumed`

Each envelope carries `workspaceId`, `traceId = runId`, and `spanId = nodeId`. Source defaults to `agentskitos://flow/<runId>`. Defensive JSON-stringify of node outputs (cyclic / unserializable values rendered as `[unserializable]`).

`BridgeOptions` accepts injected `source`, `newEventId`, `now` for tests and custom telemetry chains.

Pure mapping; only side effect is `bus.publish`.

Wires together with `@agentskit/os-audit`'s `AuditEmitter` so a single `bus.subscribe('flow.*', emitter.ingest)` makes every flow run produce a tamper-evident batch chain.
