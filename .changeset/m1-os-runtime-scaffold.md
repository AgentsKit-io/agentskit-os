---
"@agentskit/os-runtime": minor
---

Scaffold `@agentskit/os-runtime` package — handler factories with pluggable adapters. Fourth public package. No AgentsKit dependency in core; implementers plug in.

Adapter interfaces: `LlmAdapter`, `ToolExecutor`, `HumanReviewer`, `MemoryAdapter`. `AdapterRegistry` aggregates them.

Handler factories:
- `createAgentHandler(lookup, llm)` — composes system prompt + user input, dispatches via LlmAdapter, captures exceptions
- `createToolHandler(executor)` — checks `knows`, dispatches, propagates structured tool errors
- `createHumanHandler(reviewer)` — maps `approved → ok`, `rejected → failed`, `pending → paused`
- `createConditionHandler(evaluator?, scopeProvider?)` — defaults to `safeBooleanEval` (literal-equality + truthy refs only); pluggable via custom evaluator
- `createParallelHandler()` — fan-out marker

`buildLiveHandlers({adapters, lookupAgent})` composes a `NodeHandlerMap`. Skips handlers when adapter absent. Always provides condition + parallel.

Consumes `@agentskit/os-core` and `@agentskit/os-flow` as `peerDependency`.
