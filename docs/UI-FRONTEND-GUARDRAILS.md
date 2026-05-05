# Frontend And UI Guardrails

AgentsKitOS will be developed by multiple coding agents. These rules keep the UI
modular, readable, and aligned with AgentsKit's responsibility boundaries.

## Composition Rules

1. **Screens compose, hooks decide.** Screen `index.tsx` files should assemble
   components and bind events. Data shaping, async calls, derived state, filters,
   and formatting decisions belong in `use-*.ts` hooks or shared utilities.
2. **Small components by default.** A production React component should stay
   under 140 lines. Screen composition files may reach 240 lines only when they
   are mostly declarative composition.
3. **One object, one contract.** Flow, agent, run, trace, integration, benchmark,
   and policy UI must consume typed contracts instead of ad hoc mock shapes.
4. **Reuse the design system.** Use `@agentskit/os-ui`, existing app primitives,
   `clsx`/`cn`, `class-variance-authority`, and `tailwind-merge` before creating
   new variants.
5. **Use standard libraries.** Use `date-fns` for date math and formatting
   helpers, `Intl` for locale-aware number/currency rendering, and established
   dialog/animation primitives already present in the app.
6. **No production fixtures.** Demo labels like `Preview data`, hardcoded
   dashboards, and fixture-only lists cannot ship in primary flows.
7. **Accessible primitives only.** Navigation is links/buttons, not clickable
   `div`s. Dialogs manage focus. Command palette rows are keyboard operable.
8. **No duplicated UI logic.** Status labels, status colors, cost formatting,
   duration formatting, provider badges, and empty states should be shared.

## File Boundaries

Preferred screen shape:

```text
apps/desktop/src/screens/flows/
  index.tsx              # composition only
  use-flows.ts           # data, derived state, sidecar calls
  flow-detail-panel.tsx  # small presentational component
  flow-list.tsx          # small presentational component
  __tests__/
```

Move shared primitives to the closest stable shared package:

- Use `apps/desktop/src/...` for desktop-only behavior.
- Use `packages/os-ui` for reusable visual primitives.
- Use `packages/os-core` for contracts and headless behavior.

## Automated Gate

Run this before handing work to another agent:

```bash
pnpm check:quality-gates
```

The quality gate includes architecture checks and UI checks. Existing debt is
baselined so current work can continue, but new debt fails Husky and CI.

When an intentional cleanup removes old debt, update the baseline in the same
PR:

```bash
node scripts/check-ui-guardrails.mjs --update-baseline
node scripts/check-architecture-guardrails.mjs --update-baseline
```

## What The UI Gate Blocks

- New oversized components or hooks.
- New direct sidecar/IPC calls from visual components.
- New inline date math/formatting inside TSX components.
- New hardcoded color utilities in feature screens.
- New duplicated status/format helper maps inside screens.
- New giant inline `className` strings that should become variants.

The goal is not bureaucracy. The goal is to make Codex, Claude Code, Cursor, and
future agents produce code that feels like one product rather than several
competing prototypes.
