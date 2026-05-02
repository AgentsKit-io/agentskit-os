---
"@agentskit/os-flow": minor
---

Scaffold `@agentskit/os-flow` package — DAG executor for AgentsKitOS flow configs. Pure async, run-mode aware, durable via checkpoint callback.

`topo.ts`: `topoSort()` (Kahn's algorithm, deterministic order via sorted ready set), `auditGraph()` (typed `GraphIssue[]` with codes `duplicate_node_id | edge_from_missing | edge_to_missing | entry_missing | unreachable_node | cycle`), `findUnreachable()`, `buildAdjacency()`, `reachableFrom()`.

`handlers.ts`: `NodeHandler` contract with typed `NodeOutcome` (`ok | failed | paused | skipped`). `composeHandlers()` for plugin merging. `defaultStubHandlers(reason)` for run modes that stub all execution.

`runner.ts`: `runFlow(flow, opts)` returns `RunResult` with `status`, ordered outcomes, executed order, optional `stoppedAt`/`reason`. Honors `edge.on` semantics (`success | failure | always | true | false`). Stops on first `failed` or `paused`. Catches handler exceptions. Optional `checkpoint` callback per node + `onEvent` stream (`node:start | node:end`).

Consumes `@agentskit/os-core` as `peerDependency` per ADR-0002. Yaml/parse not needed — operates on already-validated `FlowConfig` from os-core.
