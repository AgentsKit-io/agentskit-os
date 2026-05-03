---
"@agentskit/os-cli": minor
"@agentskit/os-headless": minor
---

feat(os-cli): doctor tests live LLM call + sandbox round-trip (#225)

Extends `packages/os-cli/src/commands/doctor.ts`:

- New `--live` flag (default off). When set, doctor runs two extra checks:
  1. **Live LLM probe** — calls a host-injected `DoctorLlmAdapter.invoke()` with a tiny "ping" prompt (max 8 tokens), verifies the response shape. 10 s timeout, error code `os.cli.doctor_live_timeout`.
  2. **Sandbox round-trip** — spawns a no-op command through a host-injected `DoctorSandboxSpawner` and confirms the child exits 0. 5 s timeout, same error code.
- Both probes use dependency injection (`createDoctor(liveOpts?)`) so tests use fast fakes without spawning real processes or hitting real LLMs.
- Output adds `live:llm` and `live:sandbox` lines to the doctor report.
- Without `--live`, behaviour is unchanged.
- Exports `createDoctor`, `runDoctor`, `DoctorLlmAdapter`, `DoctorSandboxSpawner`, `DoctorLiveOpts`, `LiveChecks`, `DoctorReport`.

feat: @agentskit/os-headless — first-class headless runner (initial release) (#223)

New public package `@agentskit/os-headless` (`distribution: public`, `stability: alpha`).

Provides the **first-class headless agent runner** — bridge between a workspace config and a running agent without any UI.

Public surface:
- `createHeadlessRunner(opts)` → `HeadlessRunner` with `runFlow`, `runAgent`, `dispose`.
- `runWorkspace(opts)` — convenience single-call wrapper.
- `runFlowHeadless` — alias for `runWorkspace`.

Key behaviours:
- Live modes (`real`, `deterministic`) use `buildLiveHandlers` from `os-runtime`.
- Stub modes (`dry_run`, `simulate`, `replay`, `preview`) use `defaultStubHandlers` from `os-flow`.
- `dispose()` flushes audit batches via `AuditEmitter.flushAll()`.
- Cancellation via `AbortSignal` propagated to `os-flow` runner.
- Flow lookup from `Map<string, FlowConfig>` or `Record<string, FlowConfig>`; accepts `FlowConfig` directly.
- Observability hook forwarded to `os-flow` `onEvent`.
