---
"@agentskit/os-core": minor
---

Add run-mode runtime contracts per ADR-0009. Six modes: `real`, `preview`, `dry_run`, `replay`, `simulate`, `deterministic`. Each has a `RunModePolicy` (llm source, side-effects scope, state persistence, cost charging). `escalationRule(from, to)` returns one of `allowed | allowed-with-hitl | forbidden-must-branch | forbidden-must-reauthor | forbidden-must-demote`. `checkDeterminism()` reports typed `DeterminismIssue`s for non-zero temperature, unpinned models, missing tool stubs, and uncontrolled randomness. `RunContext` Zod schema (runMode + workspaceId + runId + parentRunId + startedAt). New subpath export `@agentskit/os-core/runtime/run-mode`.
