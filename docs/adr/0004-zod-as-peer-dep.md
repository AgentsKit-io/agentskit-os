# ADR-0004 — Zod v4 as `peerDependency`

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

ADR-0003 mandates Zod schemas at all boundaries. Zod v4 minified+gzipped is ~13 KB. If listed as a direct `dependency` of `@agentskit/os-core`, the bundled output exceeds the <15 KB budget set by ADR-0001.

Additionally, every `@agentskit/os-*` package will validate against shared schemas. If each lists Zod as a `dependency`, consumer projects risk multiple Zod versions in the install graph.

## Decision

Zod v4 is a **`peerDependency`** of `@agentskit/os-core` and any other `@agentskit/os-*` package that ships schemas.

- `peerDependencies`: `"zod": "^4.0.0"`
- `devDependencies` mirrors the version for tests.
- `tsup` config marks `zod` as `external` so it is not inlined into `dist`.

Consumer projects install Zod once; all OS packages share the single instance.

## Consequences

- Size budget protected. `os-core` self-bundle stays measured against the budget without Zod weight.
- Single canonical Zod version across the stack. Avoids `instanceof ZodError` mismatches.
- Slightly more setup for consumers (one extra `pnpm add zod`). Mitigated by `agentskit-os init` adding it automatically.
- CI must verify `peerDependency` is declared — extend `scripts/check-no-agentskit-deps.mjs` (or add sibling script) to assert Zod is `peer`, not `dep`.

## Alternatives Considered

- **Zod as direct dependency.** Rejected. Bundle bloat + multi-version risk.
- **Bundle Zod inlined.** Rejected. Same bloat. Defeats the budget.
- **Switch to Valibot (~3 KB).** Considered. Better size profile, but smaller ecosystem and weaker error model. Reconsider for v2 if Valibot matures and Zod cannot meet budget on larger schemas.
- **Hand-rolled validators.** Rejected. Reinventing parse + error reporting violates "don't duplicate" instinct.

## Enforcement

- New CI check (M0 follow-up): `scripts/check-zod-is-peer.mjs` fails if any `@agentskit/os-*` package lists `zod` in `dependencies`.
- ADR-0001 size budget continues to be enforced by `size-limit`.
