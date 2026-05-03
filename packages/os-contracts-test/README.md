# @agentskit/os-contracts-test

> Golden contract test suites for AgentsKitOS backend impls.

**Distribution:** `internal-only` (per ADR-0014, until 1.0)

## Suites

- `runCheckpointStoreSuite(hooks, label, factory)` — `CheckpointStore`
- `runBatchStoreSuite(hooks, label, factory)` — `BatchStore`
- `runEventBusSuite(hooks, label, factory)` — `EventBus`

Each suite is hook-injected so it stays free of vitest globals and can be invoked from any vitest-based test file:

```ts
import { describe, it, beforeEach, expect } from 'vitest'
import { runCheckpointStoreSuite } from '@agentskit/os-contracts-test'
import { MyRedisCheckpointStore } from './my-store.js'

runCheckpointStoreSuite(
  { describe, it, beforeEach, expect },
  'MyRedisCheckpointStore',
  () => new MyRedisCheckpointStore(redisUrl),
)
```

The suites in `tests/conformance.test.ts` already drive every in-tree impl through every applicable suite.
