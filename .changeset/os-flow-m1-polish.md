---
'@agentskit/os-flow': minor
'@agentskit/os-core': patch
---

feat(os-flow): M1 polish — four issues in one PR

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
