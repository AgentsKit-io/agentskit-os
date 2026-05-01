# AgentsKitOS

OS-layer on top of [AgentsKit](https://github.com/EmersonBraun/lib). Visual harness, SDLC, orchestrator, marketplace for agents. Configurable via YAML, GUI, or pure code.

> **Foundation > speed.** Small, correct, documented deliveries. No shortcuts on contracts, ADRs, or tests.

## Status

Pre-alpha. Milestone **M0 — Foundations**. See [`ROADMAP.md`](./ROADMAP.md).

## Philosophy

1. `@agentskit/os-core` stays ultralight. Contracts + event bus + workspace model only. Zero LLM/UI deps. **<15 KB gzipped**.
2. Never duplicate AgentsKit. Import core/runtime/adapters/memory/tools/skills as deps. OS = thin layer.
3. Every package independently installable. Use 1 piece without the desktop.

## Architecture Decision Records

- [ADR-0001 — Philosophy & non-negotiables](./docs/adr/0001-philosophy.md)
- [ADR-0002 — Depend on AgentsKit, never duplicate](./docs/adr/0002-depend-on-agentskit.md)
- [ADR-0003 — Config schema (Zod, layered)](./docs/adr/0003-config-schema.md)

## License

MIT
