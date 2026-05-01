# M0 — Foundations Sprint (week 0–3)

Goal: every governance + tooling artifact in place **before any code package is written**. Foundation > speed.

## Definition of Done (M0)

- [ ] Monorepo bootstrapped (turbo+pnpm), no packages yet beyond skeleton.
- [ ] All ADRs (0001/0002/0003) merged to `main`.
- [ ] RFC process documented + first RFC template usable.
- [ ] CONTRIBUTING.md, SECURITY.md, LICENSE, CODE_OF_CONDUCT.md committed.
- [ ] Issue templates + PR template in `.github/`.
- [ ] CI green: lint, type-check, test (no tests yet → placeholder), size-budget guard skeleton.
- [ ] Changesets configured + release workflow dry-run passing.
- [ ] All 123 issues created on GitHub Project board, mapped to milestones.
- [ ] Codeowners + branch protection rules documented.
- [ ] Empty `@agentskit/os-core` package created with: `package.json`, `tsconfig.json`, `src/index.ts` (export {}), `vitest.config.ts`, README, changeset.

## Step-by-step (issues F-1 .. F-13)

### Week 0 — Governance docs (no code)
1. F-2/F-3/F-4 — ADRs (DONE in this session, ready to commit).
2. F-5 — RFC process + template.
3. F-6 — CONTRIBUTING.md.
4. F-7 — SECURITY.md.
5. F-8 — LICENSE + license header script.
6. F-11 — Codeowners + PR template.
7. F-12 — Issue templates.
8. F-13 — Dogfooding tracker.

### Week 1 — Tooling skeleton
9. F-1 — turbo+pnpm monorepo bootstrap (root configs only, no packages yet beyond placeholder).
10. F-10 — CI workflows (lint, type-check, test, size-budget).
11. F-9 — Changesets setup.

### Week 2 — Project board
12. Create GitHub repo, push.
13. Create Project board with columns + labels.
14. Bulk-create 123 issues from `EPICS.md` mapping (script via `gh` CLI).
15. Assign milestones M0..M10.

### Week 3 — Validation
16. Open dummy PR to verify CI, codeowners, changesets, size-budget all wire correctly.
17. Verify changesets dry-run release.
18. Tag M0 complete. Open M1 sprint.

## Code Allowed in M0 (strictly limited)

- Root configs: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.eslintrc`, `.prettierrc`, `vitest.workspace.ts`, `package.json`.
- One placeholder package `@agentskit/os-core` exporting nothing yet — exists only to validate the build pipeline.
- CI workflow YAMLs.
- License-header insertion script.
- Bulk-issue-creation script (one-time, for setup).

## Code NOT Allowed in M0

- Any business logic.
- Any Zod schema beyond a stub.
- Any package other than `os-core` placeholder.
- Any UI work.
- Any runtime/flow/trigger code.

Reason: every line written before the foundation is in place is a line that drifts from the contract.

## M0 Exit Criteria → M1 Entry

When M0 is signed off, M1 begins:
- Write `@agentskit/os-core` Zod schemas (Workspace, Agent, Flow, Trigger, Plugin, Vault, ConfigRoot).
- Each schema: type + parse + tests + doc snippet + ADR if non-obvious.
- No M1 PR merges until its corresponding contract schema lands in `os-core`.
