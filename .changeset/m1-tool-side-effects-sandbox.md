---
"@agentskit/os-core": minor
---

Add tool side-effects + sandbox levels per ADR-0010.

`tools/side-effects`: 5-level taxonomy `none | read | write | destructive | external`. `maxSeverity()` aggregates multi-effect tools (defaults to `external` for empty list — most restrictive). `decideToolAction(mode, effects)` resolves the full RunMode × SideEffect policy table from ADR-0009, returning a typed `ModeAction` (`run | run-with-audit | run-with-audit-and-egress-check | block | stub | replay | replay-no-op | mocked | run-require-fixture`).

`tools/sandbox`: 5-level isolation enum `none | process | container | vm | webcontainer`. `MIN_SANDBOX_FOR` policy matrix. `decideSandbox(effects, requested?, force?)` returns `apply | reject`. Workspace can elevate above minimum freely; weakening below minimum requires `force: true` (warning logged). `SandboxRuntime` interface for plugin-registered runtimes. `ToolManifest` Zod schema (id + name + sideEffects[] + optional minSandbox).

New subpath exports `@agentskit/os-core/tools/side-effects` and `@agentskit/os-core/tools/sandbox`.
