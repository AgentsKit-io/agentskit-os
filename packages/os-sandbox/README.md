# @agentskit/os-sandbox

Sandbox runtimes per ADR-0010. Built-in `none` (in-process) + `process` (child_process). Container / VM / WebContainer ship as plugins.

## Status

Pre-1.0 alpha. M1 ships boundary only — seccomp / job-object hardening lands in M6.

## API

- `noneSandbox` — level `none`, rejects all spawn (in-process compute only)
- `processSandbox(opts?)` — level `process`, spawns child processes via injected `Spawner`. Strips env to allowlist (`PATH`, `HOME`, `TZ`, `LANG`, `LC_ALL`, `NODE_ENV`, `AGENTSKITOS_*`).
- `SandboxRegistry` — resolves `SandboxLevel` → `SandboxRuntime`. Plugins register `container` / `vm` / `webcontainer`.
- `nodeSpawner()` — default `Spawner` backed by `node:child_process.spawn`.

## License

MIT
