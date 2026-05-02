---
"@agentskit/os-sandbox": minor
---

Scaffold `@agentskit/os-sandbox` package — sandbox runtimes per ADR-0010. Ninth public package.

Built-in runtimes:
- `noneSandbox` (level `none`) — in-process compute marker. Rejects all `spawn()` calls; safe only for `sideEffect: 'none'` tools.
- `processSandbox(opts?)` (level `process`) — spawns child processes via pluggable `Spawner`. Strips env to allowlist (`PATH`, `HOME`, `TZ`, `LANG`, `LC_ALL`, `NODE_ENV`, plus `AGENTSKITOS_*`). Supports `defaultEnv` and `defaultCwd`. Always uses `pipe` stdio.

`Spawner` interface + `nodeSpawner()` default backed by `node:child_process.spawn`. In-memory fakes used for hermetic tests.

`SandboxRegistry` — maps `SandboxLevel` → `SandboxRuntime`. Built-ins registered by default; plugins register `container` / `vm` / `webcontainer` per ADR-0012. `resolveOrThrow(level)` for runtime safety.

Hardening (seccomp / job-object / network namespace) deferred to M6 follow-up ADR.

Consumes `@agentskit/os-core` as `peerDependency`.
