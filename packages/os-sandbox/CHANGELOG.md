# @agentskit/os-sandbox

## 1.0.0-alpha.0

### Minor Changes

- 1325f14: Scaffold `@agentskit/os-sandbox` package — sandbox runtimes per ADR-0010. Ninth public package.

  Built-in runtimes:

  - `noneSandbox` (level `none`) — in-process compute marker. Rejects all `spawn()` calls; safe only for `sideEffect: 'none'` tools.
  - `processSandbox(opts?)` (level `process`) — spawns child processes via pluggable `Spawner`. Strips env to allowlist (`PATH`, `HOME`, `TZ`, `LANG`, `LC_ALL`, `NODE_ENV`, plus `AGENTSKITOS_*`). Supports `defaultEnv` and `defaultCwd`. Always uses `pipe` stdio.

  `Spawner` interface + `nodeSpawner()` default backed by `node:child_process.spawn`. In-memory fakes used for hermetic tests.

  `SandboxRegistry` — maps `SandboxLevel` → `SandboxRuntime`. Built-ins registered by default; plugins register `container` / `vm` / `webcontainer` per ADR-0012. `resolveOrThrow(level)` for runtime safety.

  Hardening (seccomp / job-object / network namespace) deferred to M6 follow-up ADR.

  Consumes `@agentskit/os-core` as `peerDependency`.

- 4cf66bf: os-sandbox — egress default-deny enforcer (ADR-0011)

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

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
