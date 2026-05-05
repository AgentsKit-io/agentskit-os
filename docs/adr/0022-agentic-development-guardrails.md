# ADR-0022 — Agentic Development Guardrails

- **Status:** Accepted
- **Date:** 2026-05-05
- **Deciders:** @EmersonBraun

## Context

AgentsKitOS is built by multiple coding agents and is itself a dogfood target for
agent orchestration. That is useful only if the repository resists the common
agent failure mode: adding polished but disconnected surfaces, duplicating
contracts, increasing mocks, and hiding uncertainty behind `unknown` or `any`.

AgentsKit already has clear package responsibilities:

- `@agentskit/core` owns primitives and controller contracts.
- `@agentskit/adapters` owns providers, routing, fallback, ensemble.
- `@agentskit/runtime` owns execution loops, durable runs, topologies, delegates.
- `@agentskit/tools`, `memory`, `rag`, `skills`, `observability`, `eval`,
  `sandbox`, and `cli` own their respective domains.

AgentsKitOS must be the composition layer above those pieces: workspace policy,
flows, domain templates, security, observability, HITL, cost control, desktop UX,
and orchestration across providers. It must not become a second, incompatible
agent framework.

## Decision

Adopt executable guardrails for every human or AI contributor:

1. **Contracts before surfaces.** A new screen must consume a typed OS/headless
   contract or ship the contract in the same PR.
2. **No hidden runtime mocks.** Demo fixtures are allowed only in tests,
   story/example files, or explicit fixture modules. Production screens must not
   silently replace a failed sidecar call with invented data.
3. **No untyped IPC.** `sidecarRequest<unknown>` is architecture debt. New IPC
   methods require a named DTO and schema/narrowing at the boundary.
4. **No new `any`.** Use `unknown` plus narrowing, or a named DTO.
5. **No nested ternaries.** Branching logic must be readable and reviewable.
6. **Cyclomatic complexity budget.** Functions over the configured threshold
   must be split or moved into tested domain helpers.
7. **Duplication budget.** Repeated blocks are blocked unless extracted or
   explicitly baselined as existing debt.
8. **AgentsKit ownership alignment.** Before building a primitive, check whether
   AgentsKit already owns it. OS code composes or extends; it does not clone.

## Enforcement

`scripts/check-architecture-guardrails.mjs` runs in CI and Husky. It detects:

- new `sidecarRequest<unknown>` usage,
- new production `MOCK_*` runtime debt,
- new `Preview data` production UI labels,
- new `any`,
- nested ternaries,
- complexity above threshold,
- repeated source blocks.

The committed baseline records existing debt so the gate blocks regression
without pretending the current repo is already perfect. When debt is removed,
the baseline should be updated downward in the same PR.

## Consequences

- Some fast UI work will slow down because it must connect to a contract.
- Cursor, Claude Code, Codex, and other agents receive immediate local feedback.
- Reviewers can focus on product and architecture instead of manually spotting
  common code-shape regressions.
- The repo becomes a better testbed for the SDLC orchestrator because every
  agent has the same objective gates.

## Alternatives Considered

- **Rely on code review only.** Rejected. Multiple agents can generate too much
  surface area for manual review to catch consistently.
- **Fail on all existing debt immediately.** Rejected. That would block useful
  work before the cleanup plan lands.
- **Adopt a large lint stack first.** Deferred. Dependency-free checks give us
  immediate coverage; ESLint/Biome/Sonar-style gates can be layered on later.
