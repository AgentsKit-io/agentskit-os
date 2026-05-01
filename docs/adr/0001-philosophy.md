# ADR-0001 — Philosophy & Non-Negotiables

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

AgentsKitOS sits on top of AgentsKit. Goal: become the foundation for the agent era — used by agencies, devs, and operators alike. Long-lived ecosystem requires stable contracts and discipline. Past observation: rushed agent frameworks (Flowise, Langflow, early Dify) accumulated tech debt, broke contracts, and lost trust. We refuse that path.

## Decision

Adopt the same philosophy that makes AgentsKit credible, applied to the OS layer:

1. **Lightweight modular core.** `@agentskit/os-core` <15 KB gzipped. Zero LLM/UI deps. Contains: types, event bus, workspace model, config Zod schema, plugin contract.
2. **Plug and play.** Every package independently installable. Sensible defaults. Configurable via YAML, GUI, or pure code.
3. **Foundation > speed.** Ship small, correct, fully-tested, fully-documented increments. Slipping a date is fine. Skipping a contract, ADR, test, or doc is not.
4. **Strict TS, no `any`.** Use `unknown` and narrow. Zod at all boundaries. Named exports only.
5. **Formal contracts from day one.** ADR for architecture. RFC for breaking contract changes. Public process.
6. **Radical OSS.** MIT license. Public RFCs. Community PRs welcome.
7. **Honest comparisons + migration guides.** From day one for LangChain, Flowise, Langflow, n8n, Dify.
8. **Native security + observability.** Sandbox, audit log, trace viewer are not optional add-ons.
9. **Multi-platform from MVP.** macOS, Windows, Linux via Tauri 2.
10. **Strict SemVer + backward compat within major.**
11. **Extreme dogfooding.** AgentsKitOS itself built with AgentsKit runtime.

## Consequences

- Slower visible progress in early months. Accepted trade-off.
- High bar for PR acceptance: types + tests + docs + changeset + ADR (when applicable) or PR rejected.
- Core size budget enforced in CI. PR fails if `@agentskit/os-core` exceeds 15 KB gzipped.
- Every package ships its own README with install + minimal example.

## Alternatives Considered

- **Move fast, refactor later.** Rejected. Contract churn destroys ecosystem trust and breaks downstream plugins.
- **Monolithic OS app.** Rejected. Forces all-or-nothing adoption. Kills plugin economy.
- **Electron over Tauri.** Rejected. 100+ MB bloat conflicts with <15 MB installer target.
