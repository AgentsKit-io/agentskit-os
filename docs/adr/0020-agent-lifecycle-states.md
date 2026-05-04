# ADR-0020 — Agent Lifecycle States and Promotion Workflow

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** @EmersonBraun

## Context

Agents in AgentsKitOS move through a well-defined SDLC. Without a contract for state, every workspace would invent its own promotion convention (`v1`, `prod`, `live`, `enabled`) and drift across teams. Clinical and agency operators require explicit review gates before an agent can act in production; dev workflows can demote in-place for hotfix rollback. The platform must encode this state machine once and enforce it everywhere — registry, CLI, audit log, dashboards.

`AgentLifecycleState` already existed inside `AgentRegistryEntry` as a free string enum. What was missing: the legal transition graph, per-edge required checks, and risk-tier-aware escalations into production.

## Decision

### Canonical states

```
draft → review → approved → staged → production → deprecated → retired
```

- `draft` — initial author state; the agent runs only locally.
- `review` — submitted for human review; runs in shared dev sandboxes.
- `approved` — review passed; eligible for staging.
- `staged` — running against pre-production traffic; receives full evals.
- `production` — serving real traffic against the workspace's `WorkspaceLimits`.
- `deprecated` — still serving but no new consumers; sunset clock running.
- `retired` — terminal; no execution allowed.

### Allowed transitions

Forward edges follow the canonical order. A targeted set of reverse edges enables in-place rollback without retiring the agent:

| From → To | Why allowed |
|---|---|
| `review → draft` | author rework |
| `approved → review` | discovered defect during pre-staging gate |
| `staged → approved` | rollback before exposure |
| `production → staged` | hotfix rollback during incident |
| `deprecated → production` | sunset reversal (rare; requires evals) |

`retired` is terminal — no edges out. Any other transition is rejected with `not_allowed`.

### Required checks per edge

A transition is authorized only when every required check is satisfied. Checks are declarative tags; the registry / CI pipeline supplies the truth.

| Edge | Required checks (low risk) |
|---|---|
| `review → approved` | `reviewer_signoff`, `eval_passing` |
| `approved → staged` | `rollback_plan` |
| `staged → production` | `eval_passing` |
| `production → deprecated` | `owner_acknowledged_deprecation` |
| `deprecated → production` | `eval_passing` |

### Risk-tier escalations

Edges that *enter* `production` (`staged → production`, `deprecated → production`) escalate based on the agent's `riskTier`:

| Risk tier | Additional checks |
|---|---|
| `low` | (none) |
| `medium` | `security_audit` |
| `high` | `security_audit` |
| `critical` | `security_audit`, `risk_committee_signoff` |

### Audit event

Every executed transition emits an `agent.lifecycle.transition` event with `from`, `to`, `riskTier`, `actor`, `satisfiedChecks`, optional `reason`, and ISO `at` timestamp. This event is the only authoritative source of promotion history; registries and dashboards derive their views from the event log.

## Consequences

**Positive**
- Single state machine across CLI, desktop, registry, and audit log. No per-team convention drift.
- Risk tier wired directly into the promotion gate — critical agents cannot ship to production without explicit committee signoff, even by accident.
- Pure transition function (`evaluateTransition`) means the same logic powers CLI dry-runs, desktop UI gating, and CI promotion bots.

**Negative**
- Adding a state or check is a backward-compatible change but adding a *required* check on an existing edge is breaking. SemVer policy applies: required-check additions require a major bump unless gated by an opt-in flag.
- Risk-tier escalations only fire on edges that enter `production`. Other entry points (e.g. `staged`) intentionally skip the escalation. If an operator runs sensitive traffic through `staged`, they must enforce that policy separately.

## Implementation

- `packages/os-core/src/runtime/agent-lifecycle.ts` — pure transition machine + audit event schema.
- `packages/os-cli/src/commands/agent-promote.ts` — `agentskit-os agent promote --from <s> --to <s>` validates and emits the audit event.
- Registry write integration is a follow-up. The audit event contract is stable from this ADR forward.

## References

- ROADMAP §M1, item #335.
- `AgentRegistryEntry` (ADR-0003 schema family).
- ADR-0008 audit-log signing — receives `agent.lifecycle.transition` events.
