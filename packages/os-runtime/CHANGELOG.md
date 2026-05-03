# @agentskit/os-runtime

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1
  - @agentskit/os-flow@1.0.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- 8a18143: Add `CostTracker` + `meteredLlmAdapter` + `summarizeRun` for per-run cost accounting.

  `CostTracker` accumulates `CostEntry[]` per `runId`. Each entry carries `system`, `model`, optional `nodeId`, optional token counts, `costUsd`, `recordedAt`. Methods: `record`, `forRun`, `clear`, `totals`.

  `meteredLlmAdapter(inner, { tracker, meter?, currentNodeId? })` wraps an existing `LlmAdapter`. On every `invoke`:

  - Uses `LlmResult.costUsd` directly when adapter reports it
  - Falls back to `CostMeter` (from `@agentskit/os-core`) lookup using token usage when `costUsd` absent
  - Attaches `nodeId` when `currentNodeId()` provider is given
  - Silently skips recording when neither cost source available

  `summarizeRun(cost, currency?)` returns total + per-node + per-model breakdowns for UI / telemetry.

  Pure functions; no I/O.

- 8ee5a93: Scaffold `@agentskit/os-runtime` package — handler factories with pluggable adapters. Fourth public package. No AgentsKit dependency in core; implementers plug in.

  Adapter interfaces: `LlmAdapter`, `ToolExecutor`, `HumanReviewer`, `MemoryAdapter`. `AdapterRegistry` aggregates them.

  Handler factories:

  - `createAgentHandler(lookup, llm)` — composes system prompt + user input, dispatches via LlmAdapter, captures exceptions
  - `createToolHandler(executor)` — checks `knows`, dispatches, propagates structured tool errors
  - `createHumanHandler(reviewer)` — maps `approved → ok`, `rejected → failed`, `pending → paused`
  - `createConditionHandler(evaluator?, scopeProvider?)` — defaults to `safeBooleanEval` (literal-equality + truthy refs only); pluggable via custom evaluator
  - `createParallelHandler()` — fan-out marker

  `buildLiveHandlers({adapters, lookupAgent})` composes a `NodeHandlerMap`. Skips handlers when adapter absent. Always provides condition + parallel.

  Consumes `@agentskit/os-core` and `@agentskit/os-flow` as `peerDependency`.

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [9019a89]
- Updated dependencies [6da430a]
- Updated dependencies [fd329a6]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [c9b8e50]
- Updated dependencies [2c2fd18]
- Updated dependencies [cdfd821]
- Updated dependencies [1ec4e30]
- Updated dependencies [11ce6e7]
  - @agentskit/os-core@0.4.0-alpha.0
  - @agentskit/os-flow@1.0.0-alpha.0
