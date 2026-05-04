# ADR-0021 — Workspace Isolation and Runtime Path Layout

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** @EmersonBraun

## Context

`WorkspaceConfig` already declares `kind` (personal | team | client), `isolation` (strict | shared), and an optional `dataDir`. Until now there was no shared resolver that turned those fields into concrete on-disk paths. Every consumer (sqlite checkpoint store, vault, audit batch, traces) re-implemented its own convention, which made cross-workspace bleed possible and broke the "one developer can host many client workspaces side-by-side" use case.

We also need a single source of truth for how `AGENTSKITOS_HOME`, project-local `.agentskitos/`, and per-workspace overrides interact, so doctor checks, install scripts, backup tooling, and IDE plugins agree.

## Decision

### Resolution order for the data root

For each workspace, the runtime root is determined in this order:

1. `workspace.dataDir` if absolute.
2. `workspace.dataDir` joined against `options.projectDir` if relative and a project dir is known.
3. `options.home` (the value of `AGENTSKITOS_HOME`).
4. `<projectDir>/.agentskitos` if a project dir is known.
5. `<userHome>/.agentskitos`.
6. Throw `os.workspace.no_base_path` if none of the above are available.

This makes the project-local `.agentskitos/` the default for normal `init` usage, while letting power users redirect to a global home or per-workspace path without editing code.

### Strict vs shared isolation

- `isolation: 'strict'` (default) — runtime root is namespaced under `workspaces/<id>`. Two workspaces in the same project never share a sqlite file, vault, or trace dir.
- `isolation: 'shared'` — runtime root is the base dir directly. All workspaces in that base share storage. Use only when the operator explicitly wants cross-workspace memory (legacy migrations, single-tenant dev setups).

### Per-workspace path tree

```
<root>/
  state.sqlite      durable run state, checkpoint store
  vault/            vault backend's working dir (when backend == file)
  traces/           OTel exports + raw event log
  checkpoints/      flow checkpoint file store
  secrets/          local-only resolved-secret cache (never synced)
```

### Pure resolver

`resolveWorkspacePaths(workspace, options)` is a pure function. No `fs`, no environment access — callers inject `projectDir`, `userHome`, and `home`. Tests inject a `join` to validate Windows-style separators without touching `node:path`. This keeps `os-core` zero-I/O and within its 15 KB gzipped budget.

## Consequences

**Positive**
- Cross-workspace path collisions are structurally impossible under strict isolation. Two `team-a` and `team-b` workspaces cannot accidentally share state.
- Doctor, init, sync, and the desktop shell all derive paths from the same function. A change to the layout is a one-PR change.
- The pure resolver works in the browser-safe portions of `os-core`, including future WASM-hosted preview environments.

**Negative**
- Existing pre-ADR installs that wrote runtime data into a flat `.agentskitos/` directly (without `workspaces/<id>`) need a migration. The migration is documented in `os-cli`'s `config migrate`; under shared isolation no migration is needed.
- Strict mode means a workspace rename (changing `id`) leaves the old data tree orphaned. We accept this trade-off — implicit data migration on rename is more error-prone than asking the operator to copy or `agentskit-os sync` deliberately.

## Implementation

- `packages/os-core/src/runtime/workspace-paths.ts` — `resolveWorkspacePaths()`.
- `packages/os-core/src/schema/workspace.ts` — already carries `isolation`, `kind`, `dataDir`.
- Concrete adapter wiring (sqlite checkpoint store, file vault, traces directory) consumes the resolver in M2 follow-up tickets per package.

## References

- ROADMAP §M1, item #126.
- ADR-0009 run modes — `replay` / `simulate` rely on per-workspace traces directory.
- ADR-0008 audit-log signing — keys live under `<root>/secrets/`.
