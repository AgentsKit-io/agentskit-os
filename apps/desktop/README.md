# @agentskit/desktop

Tauri 2 desktop shell for AgentsKitOS.  Rust main process + React front-end + `@agentskit/os-headless` Node sidecar.

## Development

```sh
# From the repo root
pnpm --filter @agentskit/desktop dev

# Web-only (Vite dev server, no Tauri binary required)
pnpm --filter @agentskit/desktop dev:vite

# Production build (Tauri + Vite)
pnpm --filter @agentskit/desktop build

# Web bundle only (used by CI to gate bundle size)
pnpm --filter @agentskit/desktop build:web

# Type-check + lint
pnpm --filter @agentskit/desktop lint

# Unit tests
pnpm --filter @agentskit/desktop test
```

## Architecture

See [ADR-0018](../../docs/adr/0018-desktop-shell.md) for the full architectural rationale.

Three processes run for the app lifetime:

| Process | Language | Responsibilities |
|---|---|---|
| Tauri main (Rust) | Rust | Window management, system tray, native menus, sidecar lifecycle |
| WebView | platform | Renders the React app; no direct fs/network access |
| Sidecar | Node 22 | `@agentskit/os-headless` — all agent execution, audit, sandbox, egress |

## Service mode

When the system tray is active (default), **closing the main window hides it instead of quitting**.  The sidecar continues running in the background so in-progress agent runs are not interrupted.  The user can reopen the window at any time via the tray icon menu.

### Tray menu

| Item | Behaviour |
|---|---|
| **Show window** | Surfaces the main window, creating it if hidden. |
| **Status: Running / Idle** | Read-only label updated from sidecar `status` events. |
| **Pause runs** | Sends `runner.pause` to the sidecar — see TODO below. |
| **Resume runs** | Sends `runner.resume` to the sidecar — see TODO below. |
| **Settings…** | Opens the settings screen (TODO). |
| **Quit** | Calls `app.exit(0)` after asking the sidecar to dispose. |

### Opting out of service mode

Set the environment variable `AGENTSKITOS_NO_TRAY=1` before launching the app (or pass `--no-tray` in future CLI builds).  When opted out:

- The system tray icon is not registered.
- Closing the main window exits the app normally (and kills the sidecar).

```sh
AGENTSKITOS_NO_TRAY=1 ./AgentsKitOS
```

### Pause / Resume sidecar commands

The **Pause runs** and **Resume runs** tray menu items map to the sidecar JSON-RPC methods `runner.pause` and `runner.resume` respectively.  Both the Rust tray handler (`src-tauri/src/tray.rs`) and the TypeScript wrapper (`src/lib/sidecar.ts`) include `TODO(Refs #240)` markers — these stubs will become functional once the sidecar implements the commands in issue #240.

### Service mode banner

When the window is reopened after having been hidden, a dismissible banner ("Service mode active — the sidecar continues running in the background.") is shown at the top of the viewport.  The banner is driven by the Tauri event `tray://window-hidden` emitted from Rust whenever the close-button handler hides the window.

## Security

- CSP: `default-src 'self'; connect-src ipc: asset:` — no remote resource loads.
- `shell`, full `fs`, and `http` allowlist APIs are disabled in `tauri.conf.json`.
- All file and network operations route through typed Rust commands.

See ADR-0018 §3.4 for the full security posture.
