---
"@agentskit/os-sandbox": minor
---

os-sandbox — egress default-deny enforcer (ADR-0011)

App-level enforcement layer per ADR-0011 §4.

- `PolicyEgressEnforcer(policy)` — implements `EgressEnforcer` over an
  `EgressPolicy` from os-core; uses `checkEgress` for decisions.
- `createFetchGuard({ enforcer, fetch?, pluginId?, onDecision? })` —
  returns a `fetch`-shaped function that consults the enforcer before
  dispatching, throws a network-shaped `TypeError` on deny, and surfaces
  `net.fetch.allowed` / `net.fetch.denied` style events via `onDecision`.

Network-namespace enforcement for `container`+ sandboxes implements the
same `EgressEnforcer` interface and ships in M6 with `os-security`.

Closes #202
