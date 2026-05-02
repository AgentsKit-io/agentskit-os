---
"@agentskit/os-runtime-agentskit": minor
---

Complete ADR-0015 binding surface:

- `createAgentskitMemoryAdapter(store, opts?)` — pure mapping from AgentsKit's `MemoryStore` (`get`/`set`) to `os-runtime`'s `MemoryAdapter`. Defaults id to `store.id` then `agentskit-memory`. Optional `keyResolver(ref, ctx)` for workspace/run scoping.
- `createAgentskitRegistry(opts)` — convenience bundler. Composes LLM + tool + memory bindings into a single `AdapterRegistry` ready for `buildLiveHandlers`. Forwards options to each binding. Omits keys whose source is undefined (clean shape for `exactOptionalPropertyTypes`).

15 new tests. ADR-0015 binding surface complete (LLM ✅ tool ✅ memory ✅ registry ✅).
