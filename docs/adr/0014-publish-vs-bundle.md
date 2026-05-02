# ADR-0014 — Publish vs Bundle Policy

- **Status:** Accepted
- **Date:** 2026-05-02
- **Deciders:** @EmersonBraun

## Context

End users get AgentsKitOS as a signed Tauri bundle (`.dmg`/`.exe`/`.AppImage`). They never `npm install` anything. But the monorepo grew to many packages. Without policy, every package risks being published — bloats npm namespace, leaks internal API, and creates compat-pressure on modules that should be free to refactor.

Three audiences with different installation paths:

| Audience | Path | Packages they touch |
|---|---|---|
| End user | desktop bundle | none directly |
| Plugin author | `pnpm add @agentskit/os-core` | contracts only |
| Embedder | subset of public packages | their pick |

## Decision

Each `packages/os-*` package declares its distribution tier. Three tiers:

### 1. `public` — published to npm

Required when plugin authors or embedders compile against it.

Today:
- `@agentskit/os-core` — contracts, schemas, decision logic. **Required.**
- `@agentskit/os-cli` — `npx agentskit-os init` entry point. **Required.**
- `@agentskit/os-flow` — DAG executor. Useful for headless embedders.

Future candidates (publish only when external demand exists):
- `@agentskit/os-marketplace-sdk` — plugin publishing helpers.
- `@agentskit/os-runtime` — if embedders want headless agent execution outside desktop.

### 2. `bundled-private` — NOT on npm, ships inside Tauri

`"private": true` in `package.json`. Workspace dep only. Bundled into desktop installer.

Future packages:
- `@agentskit/os-desktop` — Tauri shell + React UI.
- `@agentskit/os-cloud-sync` — talks to hosted control plane.
- `@agentskit/os-collab` — CRDT real-time co-edit.
- `@agentskit/os-generative` — NL→agent meta-agent.
- `@agentskit/os-mcp-bridge` — runtime feature.
- `@agentskit/os-marketplace` — server-side install logic.

### 3. `internal-only` — NOT shipped at all

Tooling, fixtures, contract test suites. Never bundled, never published.

Future:
- `@agentskit/os-contracts-test` — golden fixtures for plugin authors. Published as devDep eventually but `internal-only` while pre-1.0.
- Build helper packages.

## Manifest field

Each `package.json` declares tier explicitly:

```json
"agentskitos": {
  "distribution": "public" | "bundled-private" | "internal-only",
  "stability": "alpha" | "beta" | "stable",
  ...
}
```

`distribution: bundled-private` implies `"private": true`. Lint script verifies the pair.

## Why monorepo anyway

Even bundled-private packages benefit from being separate workspace packages:

1. Build isolation — Tauri bundles only what desktop imports; treeshake friendly.
2. Test isolation — each package tests its own contract.
3. Eventual extraction — flip `distribution` and `private` when external demand emerges.
4. Clear dependency graph — ADR-0002 enforcement scripts work per-package.
5. Codeowner routing — different review surface for desktop vs core.

## Consequences

- New CI lint: every `packages/os-*/package.json` must declare `agentskitos.distribution`. Missing → fail.
- Release workflow respects the field: `public` packages publish, `bundled-private` and `internal-only` skip publish.
- README of each package states its tier prominently.
- Promotion `bundled-private` → `public` requires:
  - Stable contract (1.0 or explicit alpha note)
  - Fresh dependency audit
  - Compat matrix entry

## Alternatives Considered

- **Publish everything.** Rejected. Forces compat pressure on modules that should be free to refactor. Bloats npm namespace.
- **Publish nothing; ship binary only.** Rejected. Kills plugin ecosystem and embedder use cases.
- **Single mega-package.** Rejected. Loses build isolation, treeshake, and codeowner routing.
- **Per-PR judgment.** Rejected. Drift inevitable; need explicit policy.

## Migration

Existing packages today (post-PR #259):

- `@agentskit/os-core` → `public`
- `@agentskit/os-cli` → `public`
- `@agentskit/os-flow` → `public`

Future packages declare tier at scaffold time. CI lint added in follow-up PR (`scripts/check-distribution.mjs`).

## Open Questions

- [ ] Does the CLI lint package.json on every PR or only on releases?
- [ ] Should `internal-only` packages still expose types via dts for IDE help?
- [ ] At what % stability does `bundled-private` get re-evaluated for publish?
