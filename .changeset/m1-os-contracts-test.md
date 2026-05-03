---
"@agentskit/os-contracts-test": minor
---

New package — golden contract test suites for AgentsKitOS backend impls. ADR-0014 `internal-only` until 1.0; flips to `public` (devDep for plugin authors) after contract freeze.

Three suites:

- `runCheckpointStoreSuite(hooks, label, factory)` — covers append+load order, run isolation, round-trip, clear, monotonic ordering across many writes.
- `runBatchStoreSuite(hooks, label, factory)` — covers genesis digest, multi-batch chain verification via `verifyChain`, chain-break rejection, workspace isolation, latestDigest correctness.
- `runEventBusSuite(hooks, label, factory)` — covers exact + wildcard + hierarchical pattern matching, unsubscribe, handler-throw isolation, close semantics.

Each suite is hook-injected (`{ describe, it, beforeEach, expect }`) so it stays free of vitest globals and can be invoked from any vitest-based test file.

Conformance harness in `tests/conformance.test.ts` already drives:
- `InMemoryCheckpointStore` + `SqliteCheckpointStore`
- `InMemoryBatchStore` + `SqliteBatchStore`
- `InMemoryEventBus`

New backends prove conformance by adding a single `runXSuite(...)` line.
