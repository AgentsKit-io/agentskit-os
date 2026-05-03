# ADR-0017 — CLI Verb Surface

- **Status:** Accepted
- **Date:** 2026-05-02
- **Deciders:** @EmersonBraun

## Context

`@agentskit/os-cli` exposes the `agentskit-os` binary. As the CLI grows, ad-hoc verb naming leads to inconsistency (e.g. `run` vs `execute`, `new` vs `create`), collision risk across future M-series milestones, and operator tooling that breaks on rename. We need a stable contract for the verb surface that mirrors our strict SemVer + backward-compat policy (ADR-0001 §10).

A companion need: operators embedding AgentsKitOS in automated pipelines (systemd, Kubernetes Jobs, CI scripts) require man-pages to integrate with existing tooling that uses `man(1)`. Generating them automatically from the router prevents documentation drift.

## Decision

### Current verb surface (v2.x)

| Verb | Compound? | Summary |
|---|---|---|
| `init` | no | Scaffold a new workspace directory |
| `new` | no | Scaffold a new flow, agent, or plugin inside a workspace |
| `import` | no | Import a flow from Dify, n8n, or LangGraph |
| `run` | no | Execute a flow run (local, preview, or cloud) |
| `lock` | no | Pin all plugin + provider versions into the lockfile |
| `sync` | no | Sync workspace state with AgentsKit Cloud |
| `publish` | no | Publish a plugin or flow to the marketplace |
| `deploy` | no | Deploy a workspace or flow to a cloud target |
| `config validate` | yes (two-segment) | Validate a config file against the schema |
| `config explain` | yes | Explain every field of a config file |
| `config diff` | yes | Diff two config files (or one file against defaults) |
| `config migrate` | yes | Migrate a config file to the latest schema version |
| `doctor` | no | Diagnose environment / dependency / credential issues |
| `version` | no | Print CLI and os-core versions |

### Naming conventions

1. **Single verb preferred.** Use the shortest unambiguous English imperative (`run`, `lock`, `sync`).
2. **Dash-separated compound for scoped sub-commands.** When a command logically belongs to a namespace, use `<namespace> <verb>` two-segment form (`config validate`, `config diff`). The router matches the two-token form first.
3. **No abbreviations.** `import` not `imp`; `publish` not `pub`. Abbreviations create ambiguity as the surface grows.
4. **No `--subcommand` flags.** Sub-command logic is encoded in the verb, not in flags. Flags are reserved for options.
5. **Past-tense words forbidden as verbs.** Use `migrate` not `migrated`; `lock` not `locked`.

### Forward-compatibility policy

1. **New verbs** require an ADR addendum (or a new ADR if the change is substantial). The addendum must be merged before the verb ships.
2. **Renames** require a deprecation alias for one full major version. The old verb MUST continue to work, printing a deprecation notice to stderr, and MUST NOT be removed until the next major bump.
3. **Removals** follow the same one-major grace period as renames.
4. **Two-segment namespace additions** (e.g. a new `config <verb>`) do not require a full ADR — a PR description suffices — because they are strictly additive and scoped.
5. **Breaking flag changes** within an existing verb require an ADR addendum.

### Man-page generator

A Node ESM script `packages/os-cli/scripts/gen-manpages.mjs` walks `COMMANDS` from the router and emits one groff man-page per verb to `packages/os-cli/man/`. The script is invoked via:

```
pnpm --filter @agentskit/os-cli manpages
```

Man-pages follow `man(7)` section 1 (user commands). Each page contains:
- `.TH` title header
- `.SH NAME` — verb + summary
- `.SH SYNOPSIS` — `agentskit-os <verb> [options]`
- `.SH DESCRIPTION` — full description (falls back to summary if `description` field absent)

## Why

- Stable verb surface = operator tooling (CI scripts, Makefiles, k8s manifests) does not break on CLI upgrades.
- Documented naming conventions prevent future contributors from adding inconsistent verbs.
- Generated man-pages prevent doc drift (the source of truth is the router, not a wiki).
- One-major deprecation window matches our SemVer promise and gives ecosystem time to migrate.

## Consequences

- All future verb additions require either an ADR addendum or a PR note (for two-segment additions).
- Rename/removal PRs must include a deprecation alias. CI enforces this via test coverage on the old verb.
- `man/` directory is git-tracked (small, text-only, human-readable). Generated on `pnpm manpages`.
- Man-pages are included in the published npm package via the `files` field.

## Alternatives Considered

- **Free-form verb naming, per-PR decision.** Rejected — inconsistency accumulates faster than expected (see LangChain CLI history).
- **Shell completion only, no man-pages.** Rejected — man-pages are the contract for headless / automation use-cases; shell completion is supplementary.
- **Docs-as-code (MDX).** Considered for the documentation surface. Not rejected — will complement man-pages for the web docs site. Kept separate because man-page generation is structural, not narrative.

## Open Questions

- [ ] Should `pnpm manpages` run in CI to guard against drift (compare generated output to committed files)?
- [ ] Will we adopt `groff` or `mdoc` format? This ADR uses `groff` (`man(7)`); `mdoc` (BSD-style) is more semantic but less tooled in CI.
