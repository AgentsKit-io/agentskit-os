# AgentsKitOS — Roadmap

> **Prime directive:** foundation + small strong deliveries >>> shipping fast. Every milestone gates on contracts, tests, docs, ADRs. Slipping a date is acceptable. Skipping a rule is not.

## Vision

OS-layer on top of AgentsKit. Visual harness + SDLC + orchestrator + marketplace. Configurable via YAML/GUI/code. Same DNA: light core, modular, plug-and-play.

## Hard Rules (non-negotiable)

1. `@agentskit/os-core` <15 KB gzipped. Zero LLM/UI deps.
2. Never duplicate AgentsKit runtime/memory/adapters/tools/skills. Import.
3. Every package independently installable.
4. Strict TS, no `any`. Zod schemas at all boundaries.
5. Named exports only. No default exports.
6. ADR before any architectural decision. RFC before any breaking contract change.
7. Every feature ships with: types, tests, docs, changeset.
8. SemVer strict. Backward compat guaranteed within major.

## Monorepo Layout

```
packages/
  @agentskit/os-core         # contracts, event bus, workspace model, config schema (Zod)
  @agentskit/os-cli          # init, doctor, sync, run, deploy, telemetry
  @agentskit/os-desktop      # Tauri 2 shell (Rust + React)
  @agentskit/os-ui           # shadcn-based: Dashboard, FlowEditor, TraceViewer, CommandPalette
  @agentskit/os-flow         # pipeline engine (DAG, durable, checkpoint, HITL)
  @agentskit/os-triggers     # cron, webhook, file, email, slack, github, linear, cdc
  @agentskit/os-marketplace  # publish/install, signing, revenue share API
  @agentskit/os-plugins      # plugin SDK + plugin host
  @agentskit/os-observability# trace viewer, replay, anomaly detect
  @agentskit/os-security     # prompt firewall, PII redact, audit log signing, vault
  @agentskit/os-cloud-sync   # workspace sync, backup/restore, multi-device
  @agentskit/os-generative   # NL→agent/flow generator (meta-agent)
  @agentskit/os-collab       # CRDT real-time co-edit
  @agentskit/os-mcp-bridge   # publish AK tools as MCP, consume MCP servers

apps/
  desktop                    # Tauri app
  cloud                      # hosted control plane
  docs                       # fumadocs

templates/
  starter-react
  starter-ink
  starter-headless
  starter-team
```

Config: `agentskit-os.config.ts` (Zod-validated) + `workspace.yaml` per workspace + `.agentskitos/` runtime dir (sqlite, vault, traces).

## Milestones

### M0 — Foundations (week 0–3)
Repo, turbo+pnpm, ADR-0001/0002/0003, Zod contract package, CI, changesets, license, RFC process docs, security policy.

### M1 — Core + CLI alpha (week 3–8)
`@agentskit/os-core` contracts (Workspace, Agent, Flow, Trigger, Plugin, Vault). `@agentskit/os-cli`: `init`, `doctor`, `run`, `sync`. Headless runtime spawn from config. SQLite memory. Eval harness ports `@agentskit/eval`.

### M2 — Desktop MVP (week 8–14)
Tauri shell, dashboard, command palette, agent cards, live trace, system tray, theme engine, hot-reload, snapshot/restore.

### M3 — Flow Orchestrator (week 14–20)
DAG engine, durable execution (Temporal-style checkpointing), HITL. Visual editor (React Flow). YAML/TS round-trip. Live debugger + step-through + mock injection. 10 starter templates.

### M4 — Triggers + Integrations (week 20–25)
Cron, webhook, file watcher, email, Slack, GitHub, Linear, Postgres CDC. OAuth hub. MCP bridge v2 (publish + consume + auto-discover).

### M5 — Marketplace + Plugins (week 25–32)
Plugin SDK (UI + trigger + dashboard contributions). `agentskit-os publish`, signing, install flow, ratings, revenue share dashboard. Verified badges + security audit pipeline.

### M6 — Observability + Security (week 32–37)
Trace viewer, time-travel replay, anomaly detect, cost heat map. Prompt firewall, PII redaction, sandbox enforcement, signed audit log, encrypted vault w/ biometric unlock, SOC2/HIPAA/GDPR export wizard.

### M7 — Generative OS (week 37–43)
NL→agent/flow generator. "What-if" simulator. Agent variation/cloning. Self-heal mode. Meta-agent mode.

### M8 — Collaboration + Cloud (week 43–50)
CRDT real-time co-edit. Workspace cloud sync. Multi-device. Team seats + RBAC. Cloud hosted plan, billing portal, usage credits.

### M9 — Polish + GA (week 50–56)
Voice mode, artifact viewer, widget marketplace, a11y pass, perf budget. Migration assistants (LangChain, n8n, Dify, Flowise). 1.0 GA + Certification program launch.

### M10 — Wild Cards (post-GA)
Carbon-aware scheduler. Evolutionary/genetic agent loop. Mobile companion (RN). Agent-to-Agent open protocol.

## Differentiator Targets (1.0)

| Axis | Target |
|---|---|
| Installer size | <15 MB |
| Cold start | <800 ms |
| Core gzipped | <15 KB |
| Time to first agent | <60 s |
| Provider lock-in | Zero |
| Self-host | Day-1 |
| OSS license | MIT |
| Test coverage core | >90% |

## Epics → Issues

This repo started with a 12-epic / 123-issue snapshot (see [`docs/EPICS.md`](./docs/EPICS.md)).
The live roadmap is now tracked in the GitHub Project board (250+ items) at `https://github.com/orgs/AgentsKit-io/projects/2/views/1`.

## Release Readiness

Alpha / Beta / GA gates: [`docs/RELEASE-GATES.md`](./docs/RELEASE-GATES.md).
