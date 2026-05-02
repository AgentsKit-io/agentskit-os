---
"@agentskit/os-runtime": minor
---

Add `CostTracker` + `meteredLlmAdapter` + `summarizeRun` for per-run cost accounting.

`CostTracker` accumulates `CostEntry[]` per `runId`. Each entry carries `system`, `model`, optional `nodeId`, optional token counts, `costUsd`, `recordedAt`. Methods: `record`, `forRun`, `clear`, `totals`.

`meteredLlmAdapter(inner, { tracker, meter?, currentNodeId? })` wraps an existing `LlmAdapter`. On every `invoke`:
- Uses `LlmResult.costUsd` directly when adapter reports it
- Falls back to `CostMeter` (from `@agentskit/os-core`) lookup using token usage when `costUsd` absent
- Attaches `nodeId` when `currentNodeId()` provider is given
- Silently skips recording when neither cost source available

`summarizeRun(cost, currency?)` returns total + per-node + per-model breakdowns for UI / telemetry.

Pure functions; no I/O.
