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

## Workflow

1. Open or claim an issue from the project board.
2. Branch: `<type>/<short-slug>` (e.g. `feat/flow-checkpoint`).
3. Implement in small, atomic commits.
4. `pnpm changeset` describing user-visible impact.
5. Open PR, reference issue, fill PR template.
6. CI must pass: lint, type-check, test, size-budget.
7. Codeowner review required.
8. Squash-merge.

## Commit Style

Conventional Commits. Examples:
- `feat(os-core): add Workspace zod schema`
- `fix(os-flow): retry honors max attempts`
- `docs(adr): 0004 trigger contract`
- `chore(ci): bump action versions`

## Code Style

- Headless components — no hardcoded styles, use `data-akos-*` attributes.
- Prefer composition over options bags.
- No comments restating code. Comments only for non-obvious **why**.
- Errors: typed errors with discriminant `kind`, never raw strings.

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
