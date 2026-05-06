---
'@agentskit/os-flow': patch
---

#199: add `createFlowCostMeter` — stateful per-(system, model) meter that emits `FlowCostTickEvent` on every `record()` call and fires `onBudgetExceeded` exactly once when the cumulative cost crosses the configured budget. Pair with an `AbortController` to cancel the run, or call `cancelOnBudget()` to abort retroactively.
