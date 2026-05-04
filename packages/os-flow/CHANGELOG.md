# @agentskit/os-flow

## 1.0.0-alpha.2

### Patch Changes

- d8d295c: Add live debugger primitives for flow runs: breakpoints pause before node
  execution, mock outcomes can replace handlers, and step mode supports
  node-by-node execution with seeded outcomes.

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- 9019a89: Add `createBusOnEvent` bridge — converts flow `onEvent` callbacks into OS events (ADR-0005) on an `EventBus`. Ties durable runs to the audit chain end-to-end.

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

- 6da430a: Add durable execution module per RFC-0002 / ADR-0009. `CheckpointStore` interface (`append`, `load`, `clear`); `InMemoryCheckpointStore` reference impl with `listRuns()`. Real backends (sqlite, redis, postgres) implement `CheckpointStore`.

  `resumeFlow(flow, opts)` returns `DurableRunResult` with `resumedFrom: string[]` listing nodes restored from checkpoints. Resume rules:

  - Replays prior checkpoints in order; only `ok | skipped` outcomes count as resumable
  - Stops resume at first `failed | paused` checkpoint — that node is re-executed
  - Persists every executed outcome via `store.append`
  - Same edge.on semantics as `runFlow` (success/failure/always/true/false)
  - Honors graph audit + topo sort failure-fast

  Emits `node:resumed` event in addition to `node:start`/`node:end`.

- fd329a6: Scaffold `@agentskit/os-flow` package — DAG executor for AgentsKitOS flow configs. Pure async, run-mode aware, durable via checkpoint callback.

  `topo.ts`: `topoSort()` (Kahn's algorithm, deterministic order via sorted ready set), `auditGraph()` (typed `GraphIssue[]` with codes `duplicate_node_id | edge_from_missing | edge_to_missing | entry_missing | unreachable_node | cycle`), `findUnreachable()`, `buildAdjacency()`, `reachableFrom()`.

  `handlers.ts`: `NodeHandler` contract with typed `NodeOutcome` (`ok | failed | paused | skipped`). `composeHandlers()` for plugin merging. `defaultStubHandlers(reason)` for run modes that stub all execution.

  `runner.ts`: `runFlow(flow, opts)` returns `RunResult` with `status`, ordered outcomes, executed order, optional `stoppedAt`/`reason`. Honors `edge.on` semantics (`success | failure | always | true | false`). Stops on first `failed` or `paused`. Catches handler exceptions. Optional `checkpoint` callback per node + `onEvent` stream (`node:start | node:end`).

  Consumes `@agentskit/os-core` as `peerDependency` per ADR-0002. Yaml/parse not needed — operates on already-validated `FlowConfig` from os-core.

- c9b8e50: Add `estimateFlowCost` — pre-flight cost estimator for FlowConfig.

  New export: `packages/os-flow/src/cost-estimator.ts`

  - `estimateFlowCost({ flow, agents, prices, defaultModelTokens? })` walks every `FlowNode` and projects token + USD cost before execution.
  - Single-agent nodes (`agent`) resolve one agent; multi-agent nodes (`compare`, `vote`, `debate`, `auction`, `blackboard`) fan out across each agent slot. `debate` nodes additionally multiply by `rounds`.
  - Uses `computeCost` from `@agentskit/os-core` cost-meter for USD computation.
  - Missing agents or missing price-table entries produce zero-cost lines — host surfaces warnings.
  - `priceKey(provider, model)` helper exported for building `PriceMap`.
  - Fully pure; no I/O; prices and agent specs are caller-injected.

  Types exported: `NodeCostEstimate`, `FlowCostEstimate`, `AgentMap`, `PriceMap`, `EstimateOptions`.

- 2c2fd18: feat(os-flow): M1 polish — four issues in one PR

  **#205 — Event-sourced RunSnapshot for time-travel debug**

  - New `packages/os-flow/src/snapshot.ts`: `RunSnapshot` Zod schema with `runId`, `flowId`, `runMode`, `executedOrder`, `outcomes` (serialised as `[nodeId, outcome][]`), `enabledSet`, `startedAt`, `snapshotAt`.
  - `captureSnapshot()`, `outcomesFromSnapshot()`, `buildSnapshotEmitter()` helpers.
  - `RunOptions.snapshot?: SnapshotOptions` — host provides `onSnapshot` callback and optional `everyN` throttle.
  - Runner emits a snapshot after each node (or every N nodes).

  **#206 — Branch-from-past-step replay**

  - New `packages/os-flow/src/branch.ts`: `branchFromSnapshot()` validates that `branchPoint` is in `snapshot.executedOrder`, truncates history, returns `{ seedOutcomes, executedOrder, parentRunId, initialInput?, handlerOverrides? }`.
  - `RunOptions.seedOutcomes?: ReadonlyMap<string, NodeOutcome>` — seeded nodes are skipped by the runner; enabled set is re-derived from their outcomes.
  - Throws `FlowBranchError` (code `os.flow.invalid_branch_point`) for unknown branch points.

  **#188 — Two-person HITL approval**

  - New `packages/os-flow/src/human-handler.ts`: `createHumanHandler({ approverGate })` factory.
  - Host-injected `approverGate(node, ctx) => Promise<ApproverGateDecision>`.
  - Reads `node.quorum` (default 1) to require N signers; emits `paused` if insufficient signers, `failed` (code `os.flow.hitl_quorum_unmet`) on rejection or gate throw.
  - **os-core**: `HumanNode` gains `quorum: number` (default 1, max 32). Minimal surgical change.

  **#199 — Cost stream cancel signal (engine half; UI blocks on M2 desktop)**

  - `RunOptions.signal?: AbortSignal` — runner checks `signal.aborted` before each node.
  - Returns `{ status: 'cancelled', reason: 'os.flow.cancelled' }` immediately if aborted before or between nodes; completing run is a no-op.
  - Bus-bridge: new `run:cancelled` event kind maps to `flow.run.cancelled` CloudEvents envelope.
  - New error codes: `os.flow.invalid_branch_point`, `os.flow.cancelled`, `os.flow.hitl_quorum_unmet`.

- cdfd821: Add default in-memory handlers for five multi-agent flow node kinds (RFC-0003).

  Ships `createCompareHandler`, `createVoteHandler`, `createDebateHandler`, `createAuctionHandler`, and `createBlackboardHandler` in `packages/os-flow/src/multi-agent-handlers.ts`.

  - **compare** — fan-out to N agents, select winner via `manual` (HITL), `eval` (host evaluator), `judge` (agent judger), `first` (fastest/cheapest), or `all` (concat/merge).
  - **vote** — fan-out ballot with `majority`, `weighted`, `unanimous`, and `quorum` modes; `onTie` resolves via `human` (HITL), `first`, or `judge`.
  - **debate** — alternating proponent/opponent for configurable rounds; judge resolves verdict; `earlyExit` modes `judge-decides` and `on-agreement` supported.
  - **auction** — bidders race for a task; scored by `lowest-cost`, `highest-confidence`, `fastest`, or `custom` criteria; `reservePrice` filtering, `timeout`, and `fallback` agent supported.
  - **blackboard** — shared scratchpad with `round-robin`, `volunteer`, and `priority` schedules; terminates by `rounds`, `consensus`, `agent-signal`, or `budget` limits.

  Ships `InMemoryScratchpadStore` for in-process scratchpad use in tests and lightweight deployments. Host injects `runAgent` — no LLM client imported. All handlers are pure orchestration.

  Closes #207, #208, #209, #210, #211. Refs RFC-0003.

- 1ec4e30: os-flow — RunMode engine plumbing (ADR-0009)

  Threads `RunMode` from `RunContext` into the runner so non-`real` modes
  behave correctly without forcing hosts to register stubs by hand.

  - `applyModeStubs(handlers, runMode)` — fills missing handler kinds with
    mode-appropriate stubs for `dry_run` / `replay` / `simulate` / `preview`.
    Real and deterministic modes pass through unchanged.
  - `validateDeterministicFlow({ flow, agents, tools, randomnessSources })` —
    walks the flow graph, cross-references a host-provided registry, and
    returns ADR-0009 determinism issues (non-zero temp, unpinned model,
    missing stub, uncontrolled randomness).
  - `runFlow` now runs the determinism check up front for `deterministic`
    mode and fails with `flow.determinism_violation` if any issue surfaces.
  - `bus-bridge` events carry `runMode` in their data payload.
  - `policyForMode(runMode)` re-export for consumers.

  Closes #204

- 11ce6e7: os-flow — tool side-effect policy gate (ADR-0010)

  `createPolicyToolHandler` wraps a host-provided tool handler with the
  ADR-0010 decision matrix:

  - Reads `ToolManifest` from a registry (missing → treated as `external`,
    the most restrictive).
  - Calls `decideToolAction(runMode, sideEffects)` from os-core; honors
    `block` / `stub` / `replay*` / `mocked` actions before invoking the
    real handler.
  - Calls `decideSandbox(...)` to pick a `SandboxLevel`; rejects
    weakening below the minimum unless `forceWeakSandbox: true`.
  - Surfaces every decision via `onDecision` so audit emitters can publish
    `tool.invoke.denied` / `tool.invoke.escalated` events (ADR-0005).

  `InMemoryToolManifestRegistry` ships as a default implementation.

  Closes #203

### Patch Changes

- 8167412: Internal: ADR-0014 publish vs bundle policy. Three distribution tiers — `public` (npm published, plugin authors compile against), `bundled-private` (`"private": true`, ships inside Tauri desktop bundle, not on npm), `internal-only` (tooling/fixtures, neither bundled nor published). All current packages declare `agentskitos.distribution: "public"`. CI lint `scripts/check-distribution.mjs` enforces field presence + private-flag pairing. No public API change.
- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
