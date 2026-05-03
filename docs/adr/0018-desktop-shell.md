# ADR-0018 — Desktop Shell Architecture (Tauri 2 + React + os-headless sidecar)

- **Status:** Proposed
- **Date:** 2026-05-02
- **Deciders:** @EmersonBraun

## Context

ADR-0001 commits to multi-platform desktop from MVP (macOS, Windows, Linux) with an installer ≤ 15 MB and cold-start ≤ 800 ms. M2 on the roadmap ("Desktop MVP") calls for a Tauri shell, dashboard, command palette, agent cards, live trace, system tray, theme engine, and hot-reload.

The desktop surface must:

- Surface a React UI backed by shadcn components consistent with the `apps/web` landing-site design system.
- Execute `@agentskit/os-headless` — the Node runtime that orchestrates agents, emits audit events, enforces egress (ADR-0011), and spawns sandboxes (ADR-0010) — without coupling shell stability to agent execution.
- Stay within the 15 MB installer budget (ADR-0001 non-negotiable).
- Support air-gap and self-hosted deployments.
- Never require users to have Node, npm, or any runtime pre-installed.

**Why Tauri 2 over alternatives** — Electron embeds Chromium per app (~100 MB, incompatible with budget). Wails uses Go and an OS WebView but its ecosystem is Go-first, mismatching the JS/TS stack entirely. Native (Swift + Kotlin/Java + GTK) means three separate codebases for marginal gain. Tauri 2 uses the platform's own WebView (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux), ships a lean Rust core, and supports IPC via a well-typed command layer — all fitting in a few MB of binary overhead.

**Why a sidecar over in-process Node** — Running agent code inside the Tauri render process or Rust main process would couple a shell crash to an agent failure and vice versa. Isolation makes it possible to restart the sidecar after a runaway plugin without losing the window. Audit, sandbox, and egress enforcement (ADR-0010, ADR-0011) live entirely in the sidecar, giving a clean security boundary the shell never crosses.

**Why React + Tailwind + shadcn** — The existing `apps/web` landing site already uses this stack. Sharing a design-token layer between the site and the desktop (background, surface, panel, accent, etc.) is straightforward. The component library (`packages/os-ui`) is built on shadcn primitives, which are copy-owned and carry no runtime peer-dependency cost.

## Decision

### 3.1 Process model

Three processes run for the lifetime of the app:

| Process | Language | Responsibilities |
|---|---|---|
| Tauri main (Rust) | Rust | Window management, system tray, native menus, auto-updater, OS keychain (Tauri `keyring` plugin), sidecar lifecycle |
| WebView | platform | Renders the React app; no direct fs/network access; all actions via Tauri commands |
| Sidecar | Node 22 | `@agentskit/os-headless` + workspace deps; all agent execution, audit emission, sandbox spawning, egress enforcement |

On app start, the Rust main process spawns the sidecar as a long-lived child. On app shutdown (or graceful restart), it terminates the child. The front-end is never aware of the Rust ↔ sidecar channel directly; it talks only to Tauri commands.

### 3.2 IPC

**Tauri main ↔ sidecar** — JSON-RPC 2.0 over stdio. No TCP ports are opened. The wire format is debuggable with a plain terminal, requires no extra tooling, and produces no ambient attack surface.

Three named channels (encoded as the JSON-RPC `method` namespace):

| Channel | Direction | Purpose |
|---|---|---|
| `request` | front → sidecar | User-initiated actions: run agent, cancel, read workspace config |
| `event` | sidecar → front | Observability stream: progress, token counts, run-mode state |
| `audit` | sidecar → file/remote + mirrored to front | Signed audit records for live view and persistent sink (ADR-0008) |

**Front-end ↔ Tauri main** — Standard `@tauri-apps/api` `invoke` + `listen` pattern. Tauri commands in Rust bridge `request` calls to the sidecar. Sidecar `event` and `audit` messages are forwarded to the front-end via Tauri events.

### 3.3 Bundling (per ADR-0014)

- The Tauri binary embeds the sidecar executable via the Tauri 2 sidecar feature (`tauri.conf.json > bundle > externalBin`). No separate Node install required on the user machine.
- The sidecar executable is built from `@agentskit/os-headless` bundled with Node 22 via `pkg` (or `@vercel/ncc` + embedded Node binary — whichever produces the smaller artifact; CI measures both at scaffold time and documents the winner in `apps/desktop/README.md`).
- Front-end bundle target: ≤ 5 MB gzipped. CI enforces via `size-limit` (`.size-limit.json`).
- Total installer target: ≤ 15 MB (ADR-0001). CI fails the `apps/desktop` build if the signed bundle exceeds this.

Distribution tiers per ADR-0014:

| Package | Tier | Note |
|---|---|---|
| `apps/desktop/` | n/a (Tauri app, not a package) | Ships as signed installer |
| `packages/os-ui/` | `public` | shadcn-based React primitives; embedders may use it |
| `packages/os-desktop/` | `bundled-private` | React app wired to sidecar; not on npm |

### 3.4 Security

- The sidecar inherits ADR-0011 default-deny egress. No agent, tool, or plugin can open network connections without an explicit capability grant.
- The WebView content security policy blocks remote resource loads (`default-src 'self'; connect-src ipc: asset:;`). No CDN assets, no remote fonts.
- The Tauri allowlist is scoped to the minimum required surface. `shell`, full `fs`, and `http` APIs are disabled in `tauri.conf.json`. All file and network operations route through typed Rust commands.
- The front-end has no direct access to the filesystem or network. It sends `request` channel messages; the sidecar executes and responds.
- OS keychain integration (Tauri `keyring` plugin) backs the vault store in air-gap mode (ADR-0014 §air-gap). Secret material never touches the WebView process.

### 3.5 Dependency layout

```
apps/
  desktop/                  — Tauri shell (Rust src-tauri/ + Vite dev server)
packages/
  os-ui/                    — shadcn-based React primitives (public per ADR-0014)
  os-desktop/               — bundled-private React app; consumes os-ui, wires to sidecar
```

`packages/os-desktop` has no awareness of Rust internals. It calls `@tauri-apps/api` `invoke()` and `listen()`. The IPC contract (channel names, JSON-RPC method catalogue) is documented in `packages/os-desktop/src/ipc/schema.ts` and treated as the stable surface plugin UI panels target (ADR-0012 `ui-panel` extension point).

The sidecar binary is built in CI from `@agentskit/os-headless` and its workspace dependencies. The Rust `build.rs` script copies the resulting binary into `apps/desktop/src-tauri/binaries/` before the Tauri build.

### 3.6 Hot-reload

| Scenario | Dev behaviour | Prod behaviour |
|---|---|---|
| Front-end change | Vite HMR; WebView updates in place | n/a |
| Sidecar change | nodemon-style watcher kills + respawns sidecar | cold restart required |
| Workspace config change | sidecar picks up os-flow bus `config.reload` event; no IPC protocol change | same |
| Plugin install/remove | Requires sidecar restart (ADR-0012 §hot-reload rules) | same |

No special hot-reload IPC protocol is introduced. Config reload reuses existing os-flow bus events.

### 3.7 Theme system

CSS custom properties on `:root` and `[data-theme="dark"]`. Shared token set:

```
--color-background   --color-surface    --color-panel
--color-line         --color-ink        --color-ink-muted
--color-accent
```

Tokens are defined in `packages/os-ui/src/tokens.css`. The same file (or a re-export) is consumed by `apps/web` so that the landing site and desktop share a palette without a runtime dependency.

`packages/os-ui` exports a `<ThemeProvider>` that:

1. Reads `prefers-color-scheme` on mount and sets `data-theme` accordingly.
2. Persists a manual override (light / dark / system) via `localStorage` and, in the desktop, via Tauri store plugin for cross-session memory.

## Consequences

- Plugin authors targeting the desktop write against the `ui-panel` extension point and the IPC schema — not internal Rust or app-layer APIs. Contract stability is ADR-governed.
- Desktop-only refactors (window chrome, tray icon behaviour, installer signing) do not affect `@agentskit/os-core`, `@agentskit/os-flow`, or any public embedder package.
- The 15 MB installer budget is tight. `apps/desktop` must have a `size-limit` check in CI. Exceeding the budget blocks the release.
- Sidecar process isolation means agent crashes cannot bring down the shell window. Operators get a "sidecar unreachable" error state with a restart affordance.
- Node 22 embedded via `pkg`/ncc adds ~30–40 MB before compression; the Tauri build pipeline must strip symbols and apply compression to stay within budget. This is a known constraint; CI measurements gate the approach.

## Alternatives Considered

- **Electron** — Bundles Chromium per app (~120 MB baseline). Incompatible with the ≤ 15 MB installer budget (ADR-0001). Rejected.
- **Wails** — Uses OS WebView (same as Tauri) but targets Go. Entire build toolchain and plugin ecosystem would require Go expertise inconsistent with the JS/TS-first stack. Rejected.
- **Native per-platform (Swift/Kotlin + GTK)** — Three codebases for the same feature set; ~3× engineering cost for marginal UX improvement on each platform. The WebView quality on all three is now acceptable. Rejected.
- **In-process Node (no sidecar)** — Tauri can run a Node runtime in-process via the `tauri-plugin-shell` or similar. Rejected because: (a) a rogue plugin crashing Node brings down the entire window; (b) audit signing and egress enforcement lose their isolation boundary; (c) harder to unit-test the headless layer independently of the shell.

## Open Questions

- [ ] **Linux packaging**: AppImage (universal, no install required) vs Flatpak (sandboxed, store-distributed). Trade-off is portability vs confinement. Decide before M2 release.
- [ ] **Auto-update strategy**: Tauri updater with GitHub Releases (simple, zero infra) vs a custom update server (needed for enterprise air-gap channels). Decide before M2 release.
- [ ] **Sidecar cardinality**: one sidecar process per workspace (parallel workspaces = parallel sidecars) vs one sidecar per tenant (multiplexed). Current assumption is one per workspace; multi-workspace opens an IPC routing question for a follow-up ADR.
