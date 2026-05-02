# ADR-0015 — AgentsKit Binding Strategy

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

`@agentskit/os-runtime` defines pure adapter contracts (`LlmAdapter`, `ToolExecutor`, `MemoryAdapter`, `HumanReviewer`) and never imports AgentsKit directly (ADR-0002). To run a real agent inside the OS, those contracts must be wired to AgentsKit's adapter/tool/memory layers.

Two ways to do that:

1. Inline the wiring inside `os-runtime`. Cheap today, but breaks ADR-0002 (os-runtime would depend on `@agentskit/adapters`, `@agentskit/tools`, `@agentskit/memory`). Couples release cadences and forces every embedder to install the full AgentsKit stack even when they bring their own LLM.
2. Ship the binding as a separate package. Slightly more wiring, but keeps `os-runtime` provider-agnostic and lets embedders choose their own glue.

## Decision

Create `@agentskit/os-runtime-agentskit` as a dedicated binding package.

- **Distribution tier:** `public` (ADR-0014). Plugin authors and embedders consume it.
- **Stability:** `alpha` until M2.
- **Dependency direction:** binding depends on `os-runtime` + AgentsKit. `os-runtime` never depends on the binding.

Public surface:

```ts
createAgentskitLlmAdapter(adapter: ChatAdapter, opts?): LlmAdapter
createAgentskitToolExecutor(tools: readonly Tool[]): ToolExecutor
createAgentskitMemoryAdapter(memory: MemoryStore): MemoryAdapter
createAgentskitRegistry(opts): AdapterRegistry  // convenience wrapper
```

Each function maps AgentsKit's contract to the corresponding `os-runtime` interface. No business logic.

## Rules

1. **Pure mapping only.** No retry, no caching, no auth — those live in os-runtime or in AgentsKit. Binding is a pure type/shape adapter.
2. **AgentsKit packages are peerDependencies.** Embedders pin the AgentsKit version they want. Binding declares a version range.
3. **Defensive type narrowing at the boundary.** AgentsKit return types may evolve; binding catches drift via Zod-validated shapes where reasonable.
4. **No transitive re-exports.** Binding does not re-export AgentsKit symbols; embedders import them directly. Keeps the dependency graph honest.
5. **Cost extraction is best-effort.** When AgentsKit reports `usage`, the binding fills `inputTokens`/`outputTokens`/`costUsd` on `LlmResult`. When it doesn't, fields stay undefined — `os-runtime`'s `CostTracker` already handles that case.
6. **Tool args validation stays in `os-runtime`.** The binding only invokes; schema validation per ADR-0004 lives upstream of the executor.

## Why a separate package

- ADR-0002 — `os-runtime` stays free of provider deps.
- ADR-0014 — embedders who bring their own LLM (Vercel AI SDK, raw OpenAI) skip the AgentsKit install.
- Independent release cadence — binding can patch for AgentsKit version drift without bumping `os-runtime`.
- Test surface — binding has its own contract tests against AgentsKit fakes; doesn't pollute `os-runtime` tests.
- Future: parallel bindings (`os-runtime-vercel-ai`, `os-runtime-langchain`) follow the same pattern.

## Consequences

- New package: `packages/os-runtime-agentskit`.
- New peer dep range entries: `@agentskit/adapters`, `@agentskit/tools`, `@agentskit/memory`.
- Embedder docs gain a "wiring" page showing the three lines to bind a real agent.
- Plugin authors who declare `contributes: [adapter]` may opt to ship their own binding for non-AgentsKit providers.

## Alternatives Considered

- **Single package, conditional dep.** Rejected. ADR-0002 violation; conditional imports break dts.
- **Publish binding alongside AgentsKit core repo.** Rejected. Splits codeownership; this binding is OS-shaped, not AgentsKit-shaped.
- **Make binding internal-only.** Rejected. Plugin authors need it directly.

## Open Questions

- [ ] Should the binding expose a streaming variant of `LlmAdapter` once `os-runtime` adds streaming support?
- [ ] Does the memory binding map 1:1 to AgentsKit's `MemoryStore` or to its higher-level `useMemory` hook contract?
- [ ] Tool result encoding: AgentsKit returns rich content blocks; `ToolResult.value` is `unknown`. Document the recommended JSON shape or leave to caller?
