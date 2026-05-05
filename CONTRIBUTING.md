# Contributing to AgentsKitOS

> Foundation > speed. Small correct deliveries beat fast messy ones.

## Hard Rules

1. No PR without: types + tests + docs + changeset.
2. Strict TS, no `any`. Zod at all boundaries. Named exports only.
3. ADR required for architectural decisions. RFC required for public-contract changes (see `docs/RFC-PROCESS.md`).
4. `@agentskit/os-core` size budget enforced in CI (<15 KB gzipped). PR fails if exceeded.
5. Never duplicate AgentsKit primitives — import them. See ADR-0002.
6. Every package independently installable, sensibly defaulted, configurable via YAML/GUI/code.
7. SemVer strict. Breaking changes require RFC + major bump.
8. No new architecture debt: `pnpm check:quality-gates` must pass locally and in CI.
9. New desktop surfaces must be vertical slices: typed contract, headless behavior, typed IPC, UI, tests.
10. Production source must not add hidden `MOCK_*`, `Preview data`, `sidecarRequest<unknown>`, nested ternaries, or `any`.

## Workflow

1. Open or claim an issue from the project board.
2. Branch: `<type>/<short-slug>` (e.g. `feat/flow-checkpoint`).
3. Implement in small, atomic commits.
4. `pnpm changeset` describing user-visible impact.
5. Run `pnpm check:quality-gates`.
6. Open PR, reference issue, fill PR template.
7. CI must pass: quality gates, lint, type-check, test, size-budget.
8. Codeowner review required.
9. Squash-merge.

## Commit Style

Conventional Commits. Examples:
- `feat(os-core): add Workspace zod schema`
- `fix(os-flow): retry honors max attempts`
- `docs(adr): 0004 trigger contract`
- `chore(ci): bump action versions`

### AI-assisted commits

- Do **not** add `Co-authored-by: Cursor` (or similar tool footers) unless the PR author **explicitly** requests it.
- If a hook adds that line, strip it before merge (`git commit --amend` or history rewrite on the feature branch).

## CLI (`packages/os-cli`)

- **New** commands or substantial argv changes: use **Commander** and the shared **`runCommander`** helper (`src/cli/commander-dispatch.ts`); avoid new hand-rolled `parseArgs` loops.
- Commander’s **`--no-*`** flags are negated booleans (parsed property drops the `no-` prefix, e.g. `--no-defaults` → `defaults === false`).
- Tests: help output may land on **stdout** when output is configured — assert on combined streams if needed.
- Prefer **deterministic** CLI tests (mocks/spies) when behavior depends on the developer machine (MCP configs, global paths).

## Code Style

- Headless components — no hardcoded styles, use `data-akos-*` attributes.
- Prefer composition over options bags.
- No comments restating code. Comments only for non-obvious **why**.
- Errors: typed errors with discriminant `kind`, never raw strings.
- No nested ternaries; use named helpers or explicit branches.
- Keep orchestration logic outside desktop UI. UI calls typed clients/hooks only.
- `sidecarRequest<unknown>` is forbidden for new work; define a named DTO/schema first.

## Tests

- Unit: vitest, colocated `*.test.ts`.
- Contract: every Zod schema has parse + reject tests.
- Eval (where relevant): `@agentskit/eval` test cases.
- Coverage budget for `os-core`: **>90%**.

## Docs

- Each package: README with install + minimal example.
- Public types documented with TSDoc.
- User-facing changes update `apps/docs`.

## Reporting Bugs

Open an issue with: minimal repro, expected vs actual, env (`agentskit-os doctor` output).

## Reporting Security Issues

See [`SECURITY.md`](./SECURITY.md). Never open a public issue for a security report.
