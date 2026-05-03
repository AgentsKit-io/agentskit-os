---
"@agentskit/os-flow": minor
---

os-flow — RunMode engine plumbing (ADR-0009)

Threads `RunMode` from `RunContext` into the runner so non-`real` modes
behave correctly without forcing hosts to register stubs by hand.

- `applyModeStubs(handlers, runMode)` — fills missing handler kinds with
  mode-appropriate stubs for `dry_run` / `replay` / `simulate` / `preview`.
  Real and deterministic modes pass through unchanged.
- `validateDeterministicFlow({ flow, agents, tools, randomnessSources })` —
  walks the flow graph, cross-references a host-provided registry, and
  returns ADR-0009 determinism issues (non-zero temp, unpinned model,
  missing stub, uncontrolled randomness).
- `runFlow` now runs the determinism check up front for `deterministic`
  mode and fails with `flow.determinism_violation` if any issue surfaces.
- `bus-bridge` events carry `runMode` in their data payload.
- `policyForMode(runMode)` re-export for consumers.

Closes #204
