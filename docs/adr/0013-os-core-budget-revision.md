# ADR-0013 — Revise `@agentskit/os-core` Size Budget

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

ADR-0001 set `@agentskit/os-core` ≤ **15 KB gzipped**. At the time the package contained: workspace + agent + flow + trigger + plugin schemas. That number was conservative and assumed a much smaller surface.

Real M1 scope grew to include:
- 12 Zod schemas (workspace, agent, trigger, flow, plugin, vault, memory, observability, security, cloud, rag, config-root)
- Cross-reference validation (config-root)
- Event envelope + InMemoryEventBus
- Principal + Capability + structural verifier
- Typed error envelope
- Config utilities (merge, migrate, diff)
- Vault `${vault:key}` resolver
- RunMode + escalation + determinism check
- Egress allowlist + decision logic
- Tool side-effects + sandbox levels + ToolManifest
- Audit batch chain + SHA-256 Merkle + ChainBreak codes

After PR #242, post-bundle gzipped size: **14.29 KB / 15 KB**. Headroom 0.71 KB. Next minor schema lands → blow budget → blocked.

Two paths:
1. Split `os-core` into multiple stable packages.
2. Raise the budget with explicit justification.

## Decision

**Raise the budget to 25 KB gzipped pre-1.0**, with re-evaluation at 1.0.

### Rationale

- Splitting now creates churn for downstream consumers before any exist. Premature.
- Scope is fully covered: 12 schemas is the complete config root, not a midpoint. Future additions are extensions (M2+ runtime helpers, M6 audit verifier additions) which are smaller.
- 25 KB gzipped remains lightweight: comparable to or smaller than `zod` itself. Edge-runtime safe.
- `os-core` consumers see schema bundle once; their app cost is dominated by their own code, not core.

### Hard constraints retained (non-negotiable)

- **Zero runtime deps.** `zod` stays peer (ADR-0004).
- **No LLM / UI / FS / network code.** Pure types + decision logic only.
- **No I/O.** Loaders + executors live in higher packages.
- **`tsup` `external: ['zod']`.** Bundle size measures core weight, not zod.
- **Treeshake-friendly.** Subpath exports preserved; `import { X } from '@agentskit/os-core/schema/agent'` must not pull the whole index.

### Re-evaluation triggers

Open new ADR to revise again if:
- Any single PR adds > 1 KB without proportional contract value
- 1.0 stabilizes — review whether to lock at observed steady-state size + 20% margin
- Splitting becomes warranted by consumer feedback (e.g., browser bundle complaints)

## Consequences

- `.size-limit.json` bumped from 15 KB to 25 KB.
- `package.json` `agentskitos.sizeBudgetGzipped` updated.
- ADR-0001 size table annotated with this revision.
- Future PR descriptions still report `<measured> / 25 KB` so trend is visible.
- CI guard remains active — no PR may exceed 25 KB without superseding this ADR.

## Alternatives Considered

- **Split `os-core` into `os-contracts` + `os-runtime-helpers`.** Rejected for now. Premature; no consumers yet; would force two-package coordination on every contract change. Reconsider at 1.0 if footprint matters to a real consumer.
- **Move audit + run-mode + egress to higher packages.** Rejected. They are pure decision logic with no I/O — natural foundation citizens. Keeping them in core means downstream packages and plugins consume one canonical contract instead of duplicating decision matrices.
- **Drop subpath exports, ship one big module.** Rejected. Treeshaking + import ergonomics matter more than a flat module.
