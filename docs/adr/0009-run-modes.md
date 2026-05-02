# ADR-0009 — Run Modes

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Plan uses "preview", "dry-run", "replay", "simulate", "step-through" loosely (P-5, S-2, G-5, G-8). Without one taxonomy, tool authors and plugin authors will diverge. Determinism for regulated workloads (clinical) needs a name and contract.

## Decision

Single enum at flow run boundary. All subsystems honor it.

```ts
RunMode = 'real' | 'preview' | 'dry_run' | 'replay' | 'simulate' | 'deterministic'
```

### Semantics

| Mode | LLM calls | Tool side-effects | State persistence | Cost charged | Use |
|---|---|---|---|---|---|
| `real` | live | all (per tool decl) | yes | yes | production |
| `preview` | live | only `read` + `none` (ADR-0010); `write`/`destructive` blocked | yes (preview store) | yes | safe rehearsal w/ real LLMs |
| `dry_run` | mocked | none | no | no | CI, validation, cost estimate |
| `replay` | from event log | from event log | no (read-only) | no | time-travel, debugging |
| `simulate` | mocked w/ user-provided fixtures | mocked | optional sandbox | no | what-if (G-8) |
| `deterministic` | live, temp=0, fixed seed, pinned model | tool stubs registered | yes | yes | regulated, clinical, eval |

### Mode plumbing

- `RunMode` in `RunContext` (flow runtime). Threaded into every tool/agent invocation.
- Tools declare `sideEffects` (ADR-0010). Engine compares against mode policy → reject or stub.
- Adapters receive mode hint: `deterministic` → set temp=0, seed, model-version pinned (rejected if absent).
- Event bus events carry `runMode` field.

### Branch from past step (replay extension)

`replay --from <eventId> --override <patch>` → replays up to `eventId`, applies patch (e.g. new prompt, swapped model), continues as new run lineage. Parent run pointer recorded.

### Determinism enforcement

`deterministic` mode rejects flow if:
- any agent uses non-zero temperature
- any model version is unpinned
- any tool has non-deterministic stub missing
- any source of randomness (Date.now, Math.random) not captured by `clock` injection

Validator runs at mode-switch. Reports `flow.determinism_violation` (ADR-0007).

### Mode escalation rules

| From | To | Allowed? |
|---|---|---|
| `dry_run` → `real` | always | yes |
| `preview` → `real` | always | yes (with HITL prompt for first time) |
| `replay` → `real` | never; must branch | no |
| `simulate` → `real` | never; must re-author | no |
| `deterministic` → `real` | requires unpinning | no (explicit demote) |

## Consequences

- One vocabulary across CLI, GUI, telemetry, audit log.
- Tool authors implement once, modes enforced by engine.
- Determinism mode unlocks clinical + finance.
- Adds policy table to maintain when adding tools or modes.

## Alternatives Considered

- **Two modes only (real / dry-run).** Rejected. Loses preview safety + replay + determinism.
- **Modes per-tool.** Rejected. Too fine; users want flow-level switch.
- **Plugin-defined modes.** Rejected. Fragments the contract.

## Open Questions

- Cost-aware dry-run (use cached prices to estimate)?
- Whether `simulate` should record runs as "fake" in trace viewer with banner.
