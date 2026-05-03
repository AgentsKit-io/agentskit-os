# @agentskit/desktop

Tauri 2 desktop shell for AgentsKitOS. Wraps the React 19 front-end around the
`@agentskit/os-headless` sidecar, communicating over JSON-RPC stdio.

Per ADR-0018. See also: #35, #36, #37, #38, #43, #44.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 22 |
| pnpm | >= 10 |
| Rust | >= 1.77 (stable) |
| Tauri CLI | `@tauri-apps/cli ^2` (installed as dev dep) |

> **React bundle only** (no Rust): `pnpm --filter @agentskit/desktop build:web`

---

## Development

```bash
# From repo root — install all deps
pnpm install

# Build workspace packages the desktop depends on
pnpm --filter @agentskit/os-core build
pnpm --filter @agentskit/os-headless build

# Start the Tauri dev server + React HMR
pnpm --filter @agentskit/desktop tauri dev
```

---

## Production build

```bash
pnpm --filter @agentskit/desktop build
```

Produces platform installers in `apps/desktop/src-tauri/target/release/bundle/`.

---

## Sidecar layout

The sidecar is a thin Node.js JSON-RPC server that wraps
`@agentskit/os-headless`. It is spawned by the Tauri main process on startup.

```
apps/desktop/sidecar/sidecar.mjs   ← dev shim (invoked via `node sidecar/sidecar.mjs`)
packages/os-headless/dist/         ← runtime target
```

In production the sidecar is compiled to a Node SEA (Single Executable
Application) and bundled as `agentskit-sidecar` via `bundle.externalBin` in
`tauri.conf.json`.

JSON-RPC methods:

| Method | Description |
|---|---|
| `health.ping` | Liveness check — returns `{ pong: true, ts }` |
| `runner.runFlow` | Run a flow via HeadlessRunner |
| `runner.runAgent` | Run a single agent via HeadlessRunner |
| `runner.dispose` | Flush audit batches + teardown |

Observability events are emitted as JSON-RPC 2.0 notifications
(`method: "event"`) and forwarded to the front-end via `sidecar://event` Tauri
events.

---

## Size budget

Front-end bundle caps (see `.size-limit.json`):

| Asset | Limit (gzip) |
|---|---|
| JS bundle | 200 KB |
| CSS bundle | 20 KB |

Run `pnpm size` from the repo root to check.

---

## Tauri security

- Allowlist: `core` + `window` + `tray` only. No `shell.execute`, no `fs`, no `http`.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ipc: http://ipc.localhost`
- macOS Private API enabled for native title-bar overlay.

---

## Token palette

Mirrors `apps/web/tailwind.config.ts`. Dark cyan accent (`#22d3ee`), dark
surface (`#08090c`). See `tailwind.config.ts` for full token list.
