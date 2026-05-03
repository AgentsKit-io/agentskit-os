# @agentskit/os-runtime-agentskit

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1
  - @agentskit/os-runtime@1.0.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- f3c67df: Complete ADR-0015 binding surface:

  - `createAgentskitMemoryAdapter(store, opts?)` — pure mapping from AgentsKit's `MemoryStore` (`get`/`set`) to `os-runtime`'s `MemoryAdapter`. Defaults id to `store.id` then `agentskit-memory`. Optional `keyResolver(ref, ctx)` for workspace/run scoping.
  - `createAgentskitRegistry(opts)` — convenience bundler. Composes LLM + tool + memory bindings into a single `AdapterRegistry` ready for `buildLiveHandlers`. Forwards options to each binding. Omits keys whose source is undefined (clean shape for `exactOptionalPropertyTypes`).

  15 new tests. ADR-0015 binding surface complete (LLM ✅ tool ✅ memory ✅ registry ✅).

- 8a308cc: Add `createAgentskitToolExecutor(tools, opts?)` — pure mapping from AgentsKit tool contract to `os-runtime`'s `ToolExecutor`.

  Behaviors:

  - `knows(toolId)` — O(1) lookup via internal map
  - Unknown tool → `{ kind: 'error', code: 'TOOL_NOT_FOUND', message: 'unknown tool: <id>' }`
  - Schema validation lives upstream (ADR-0004); this only dispatches
  - Return-shape normalization accepts:
    - `{ kind: 'ok', value }` / `{ kind: 'error', code, message }` (canonical)
    - `{ ok: true, value }` / `{ ok: false, code, message }` (shorthand)
    - any raw value → wrapped as `{ kind: 'ok', value }`
  - Thrown errors caught → `{ kind: 'error', code: 'AGENTSKIT_TOOL_ERROR', message }` (override via `errorCode`)
  - Non-`Error` throws coerced to string
  - `idResolver(tool)` option — namespace tool ids (e.g. `ns:name`)
  - Duplicate ids rejected at construction with `Error: duplicate tool id "<id>"`

  13 new tests. Memory binding + `createAgentskitRegistry` follow.

- f31e4d2: New package — AgentsKit binding for `@agentskit/os-runtime`. ADR-0015.

  Initial scaffold ships `createAgentskitLlmAdapter(source, opts?)` — pure mapping from AgentsKit's chat-adapter shape to `os-runtime`'s `LlmAdapter`. Forwards optional fields conservatively (omits when unset to satisfy `exactOptionalPropertyTypes`). Falls back to `finishReason: 'stop'` when source omits it; honors `defaultFinishReason` override. Passes through `inputTokens`/`outputTokens`/`costUsd` independently — `os-runtime`'s `CostTracker` already handles missing fields.

  Structural-typed today: AgentsKit packages declared as peerDeps but the binding doesn't import them at build time, since AgentsKit's contract has not yet been frozen. Tightens to real version pin once AgentsKit reaches stable.

  Tool + memory bindings + `createAgentskitRegistry` convenience wrapper land in subsequent PRs.

  Distribution: `public`. Stability: `alpha`.

### Patch Changes

- 7ae6c40: Add end-to-end integration test suite — `createAgentskitRegistry` → `buildLiveHandlers` (os-runtime) → handler invocation. Locks the binding's wire shape against `os-runtime`'s contract so future drift in either side surfaces immediately.

  `@agentskit/os-flow` added as devDep (transitively required by `os-runtime` for `parseFlowConfig`-based fixtures).

  8 new tests.

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [8a18143]
- Updated dependencies [8ee5a93]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
  - @agentskit/os-runtime@1.0.0-alpha.0
