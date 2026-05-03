# @agentskit/os-contracts-test

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1
  - @agentskit/os-audit@1.0.0-alpha.1
  - @agentskit/os-flow@1.0.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- 368cb54: New package — golden contract test suites for AgentsKitOS backend impls. ADR-0014 `internal-only` until 1.0; flips to `public` (devDep for plugin authors) after contract freeze.

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

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [54d9f3d]
- Updated dependencies [f4436c7]
- Updated dependencies [c842c12]
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
  - @agentskit/os-audit@1.0.0-alpha.0
