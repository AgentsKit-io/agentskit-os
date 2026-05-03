---
"@agentskit/os-flow": minor
---

os-flow — tool side-effect policy gate (ADR-0010)

`createPolicyToolHandler` wraps a host-provided tool handler with the
ADR-0010 decision matrix:

- Reads `ToolManifest` from a registry (missing → treated as `external`,
  the most restrictive).
- Calls `decideToolAction(runMode, sideEffects)` from os-core; honors
  `block` / `stub` / `replay*` / `mocked` actions before invoking the
  real handler.
- Calls `decideSandbox(...)` to pick a `SandboxLevel`; rejects
  weakening below the minimum unless `forceWeakSandbox: true`.
- Surfaces every decision via `onDecision` so audit emitters can publish
  `tool.invoke.denied` / `tool.invoke.escalated` events (ADR-0005).

`InMemoryToolManifestRegistry` ships as a default implementation.

Closes #203
