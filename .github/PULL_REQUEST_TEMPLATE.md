# Pull Request

## What

<!-- 1-3 lines: what changed -->

## Why

<!-- motivation, link to issue / RFC / ADR -->

## Closes / refs

<!--
REQUIRED. List every issue this PR resolves. Use one of:
- `Closes #NNN` — auto-closes the issue on merge (one per line, no commas)
- `Refs #NNN`  — for partial progress only

Multiple issues:
  Closes #13
  Closes #26
  Refs #199

If genuinely no related issue (rare), state why here.
-->

Closes #

## Checklist

- [ ] **`Closes #NNN` (or `Refs #NNN`) line above for every related issue**
- [ ] `pnpm check:quality-gates` passes; no new architecture or UI debt baseline entries
- [ ] New user-facing surface is backed by a typed contract/headless behavior, not production mocks
- [ ] Types added/updated, no `any`
- [ ] Zod schemas at all new boundaries
- [ ] Tests added/updated (unit + contract)
- [ ] Docs updated (package README + `apps/web/content/docs` if user-facing)
- [ ] Changeset added (`pnpm changeset`)
- [ ] CI green: lint, type-check, test, size-budget
- [ ] No new dependency on AgentsKit primitives that should be peer-deps (see ADR-0002)
- [ ] If breaking: RFC accepted, migration documented

## Risk

<!-- low / medium / high + reason -->

## Screenshots / demo

<!-- for UI changes -->
