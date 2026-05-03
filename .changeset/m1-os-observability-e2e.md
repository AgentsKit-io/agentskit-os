---
"@agentskit/os-observability": patch
---

Add end-to-end integration tests — `os-flow`'s `createBusOnEvent` publishes envelopes onto an `InMemoryEventBus`; log + trace + metrics handlers all subscribe and consume the same stream. Locks the wire shape produced by `os-flow` against the shape expected by `os-observability` so future drift in either side surfaces immediately.

Coverage:
- Every flow event reaches every subscribed handler (log/trace/metrics counts match)
- Error event (`{ kind: 'failed', error: { code, message } }`) surfaces `TOOL_NOT_FOUND` consistently as log fields, span `errorCode`/`errorMessage`, and metric increment
- Trace correlation: `traceId = runId`, `spanId = nodeId`, `workspaceId` propagated
- Paused outcome → warn log + `paused` span status

`@agentskit/os-flow` + `@agentskit/os-audit` added as devDeps for the test fixtures.

4 new tests.
