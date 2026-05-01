# ADR-0002 — Depend on AgentsKit, Never Duplicate

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

AgentsKitOS is an OS layer over AgentsKit. Tempting shortcut: copy or reimplement runtime/memory/adapters/tools/skills inside the OS for "control". This duplication has killed prior agent ecosystems — divergence between library and harness leads to bug parity issues, fractured docs, and abandoned forks.

## Decision

AgentsKitOS **imports** AgentsKit packages as dependencies. It never duplicates:

| Concern | Owner | OS responsibility |
|---|---|---|
| LLM adapters | `@agentskit/adapters` | Consume only |
| Runtime / ReAct loop | `@agentskit/runtime` | Consume only |
| Memory backends | `@agentskit/memory` | Consume + add OS-level encrypted vault |
| Tools | `@agentskit/tools` | Consume + plugin discovery |
| Skills | `@agentskit/skills` | Consume + marketplace distribution |
| Observability primitives | `@agentskit/observability` | Consume + visual layer (trace viewer) |
| Eval | `@agentskit/eval` | Consume + UI integration |

What AgentsKitOS **owns**:

- Workspace model (multi-workspace, isolation, per-workspace API keys/vault)
- Pipeline DAG engine + durable execution + HITL
- Triggers (cron, webhook, file, email, slack, github, linear, cdc)
- Visual UI (desktop, dashboard, flow editor, trace viewer)
- Plugin host + marketplace
- MCP bridge v2
- Generative OS (NL → agent/flow)
- Cloud sync + collaboration

## Consequences

- AgentsKit upstream changes propagate cleanly to OS.
- Bug fixes happen once, at the right layer.
- AgentsKit must keep stable public APIs. Breaking changes in AgentsKit require coordinated RFC + OS bump.
- OS contributes back: when an OS feature needs runtime support, propose it upstream as AgentsKit RFC instead of forking.
- Peer-dependency strategy: OS packages declare AgentsKit as `peerDependency` with version range (`^x.y.0`) to avoid duplicated installs in user projects.

## Enforcement

- CI rule: any `package.json` in `packages/@agentskit/os-*` that lists AgentsKit as `dependencies` (not `peerDependencies` for runtime-shared packages) fails the build.
- Codeowners file routes any PR that re-implements an AgentsKit primitive to maintainer review with mandatory ADR.

## Alternatives Considered

- **Vendor (copy) AgentsKit into OS.** Rejected. Drift inevitable.
- **Fork AgentsKit.** Rejected. Splits community + maintenance burden doubles.
- **Bundle pinned versions.** Rejected. Forces OS release on every AgentsKit patch.
