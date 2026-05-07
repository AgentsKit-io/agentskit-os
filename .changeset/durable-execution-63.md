---
'@agentskit/os-flow': patch
---

#63: add Temporal-style durable-execution helpers — `createActivityLedger` + `runActivity` (replay-safe activity invocation that returns the prior result on retry) and `createSignalChannel` (deterministic in-memory signal channel). Pure: layered on top of the existing `CheckpointStore` contract; no timers.
