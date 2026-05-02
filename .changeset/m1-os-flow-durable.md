---
"@agentskit/os-flow": minor
---

Add durable execution module per RFC-0002 / ADR-0009. `CheckpointStore` interface (`append`, `load`, `clear`); `InMemoryCheckpointStore` reference impl with `listRuns()`. Real backends (sqlite, redis, postgres) implement `CheckpointStore`.

`resumeFlow(flow, opts)` returns `DurableRunResult` with `resumedFrom: string[]` listing nodes restored from checkpoints. Resume rules:

- Replays prior checkpoints in order; only `ok | skipped` outcomes count as resumable
- Stops resume at first `failed | paused` checkpoint — that node is re-executed
- Persists every executed outcome via `store.append`
- Same edge.on semantics as `runFlow` (success/failure/always/true/false)
- Honors graph audit + topo sort failure-fast

Emits `node:resumed` event in addition to `node:start`/`node:end`.
