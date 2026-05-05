# @agentskit/os-core

Pure foundation for AgentsKitOS. Contracts, event bus, workspace model, config schema. Zero LLM/UI deps. Hard size budget: **<15 KB gzipped**.

## Status

**M0 placeholder.** No real exports yet. Contracts land in M1.

See [`ROADMAP.md`](../../ROADMAP.md) and [`docs/EPICS.md`](../../docs/EPICS.md).

## Install (will work in M1)

```bash
pnpm add @agentskit/os-core
```

## Coding-agent providers (M3 / #374)

External CLI adapters (Codex, Claude Code, Cursor, Gemini, …) implement `CodingAgentProvider` in separate packages. `@agentskit/os-core` defines the contract, schemas, and **`runConformance(provider)`**, which runs deterministic probes (dry-run scope, timeout budget, no-diff, failing tests, permission denied, artifacts, optional `cancelTask`).

- **Capabilities** (`CodingAgentCapability`): `edit_files`, `run_shell`, `run_tests`, `git_ops`, `create_pr`.
- **Scenario prompts**: `CONFORMANCE_PROMPTS` in `src/runtime/coding-agent.ts` — adapters should recognize these strings in `CodingTaskRequest.prompt` when running under the conformance suite (fakes must branch; real CLIs may need prompt engineering).
- **Marketplace**: `ConformanceReport.marketplaceBadge` is `none` or `verified-basic` when all checks pass (UI policy still applies).
- **Unsupported / partial modes**: adapter-specific (e.g. `invocation: session` without a TTY). The suite only runs `cancel_task_idempotent` when `cancelTask` is implemented.

## License

MIT
