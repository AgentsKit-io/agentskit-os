---
"@agentskit/os-runtime-agentskit": minor
---

New package — AgentsKit binding for `@agentskit/os-runtime`. ADR-0015.

Initial scaffold ships `createAgentskitLlmAdapter(source, opts?)` — pure mapping from AgentsKit's chat-adapter shape to `os-runtime`'s `LlmAdapter`. Forwards optional fields conservatively (omits when unset to satisfy `exactOptionalPropertyTypes`). Falls back to `finishReason: 'stop'` when source omits it; honors `defaultFinishReason` override. Passes through `inputTokens`/`outputTokens`/`costUsd` independently — `os-runtime`'s `CostTracker` already handles missing fields.

Structural-typed today: AgentsKit packages declared as peerDeps but the binding doesn't import them at build time, since AgentsKit's contract has not yet been frozen. Tightens to real version pin once AgentsKit reaches stable.

Tool + memory bindings + `createAgentskitRegistry` convenience wrapper land in subsequent PRs.

Distribution: `public`. Stability: `alpha`.
