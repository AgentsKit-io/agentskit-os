# AgentsKitOS — Epics & Issues (legacy snapshot)

This file captures the original 12-epic / 123-issue snapshot used to bootstrap the project board.
The live, expanded roadmap is tracked in the GitHub Project board at `https://github.com/orgs/AgentsKit-io/projects/2/views/1`.

Issue size legend: **S** ≤1d · **M** 2–4d · **L** 1–2w · **XL** 2w+.

---

## EPIC 1 — Foundations & Governance (M0)

| # | Title | Size |
|---|---|---|
| F-1 | Init turbo+pnpm monorepo, root configs (tsconfig base, eslint, prettier, vitest workspace) | M |
| F-2 | ADR-0001 Philosophy (committed) | S |
| F-3 | ADR-0002 Depend on AgentsKit, never duplicate (committed) | S |
| F-4 | ADR-0003 Config schema (committed) | S |
| F-5 | RFC process doc + template | S |
| F-6 | CONTRIBUTING.md | S |
| F-7 | SECURITY.md + reporting flow | S |
| F-8 | LICENSE (MIT) + license headers script | S |
| F-9 | Changesets setup + release workflow | S |
| F-10 | CI workflows: lint, type-check, test, size-budget guard | M |
| F-11 | Codeowners + PR template | S |
| F-12 | Issue templates (feature, bug, RFC, epic) | S |
| F-13 | Dogfooding tracker (which OS features built with AgentsKit runtime) | S |

---

## EPIC 2 — CLI & DX (M1, M2)

| # | Title | Size |
|---|---|---|
| C-1 | `agentskit-os init` — interactive scaffold (#2) | L |
| C-2 | `agentskit-os doctor` — env/perms/version diagnose (#3) | M |
| C-3 | `agentskit-os sync` — keep core/plugins/marketplace synced (#41) | M |
| C-4 | `agentskit-os telemetry` — opt-in anon usage + self-export (#67) | M |
| C-5 | Migration assistant — import old AgentsKit projects (#68) | L |
| C-6 | Offline-first arch — local models + cached marketplace (#69) | L |
| C-7 | `agentskit-os run` — execute agent/flow from CLI | M |
| C-8 | `agentskit-os deploy` — local / cloud / docker / k8s targets | L |
| C-9 | `agentskit-os config validate / explain / diff` | M |

---

## EPIC 3 — Desktop Harness (M2)

| # | Title | Size |
|---|---|---|
| D-1 | Tauri 2 shell, Rust backend + React frontend, <15 MB installer (#6) | L |
| D-2 | Central Dashboard — live status, cost, CPU/mem, traces (#7) | L |
| D-3 | System tray + service mode (#8) | M |
| D-4 | Cyber-minimal theme — dark, glass, neon accents (#9) | M |
| D-5 | Dev/Prod toggle + one-click cloud deploy (#10) | M |
| D-6 | Global command palette Cmd/Ctrl+K (#44) | M |
| D-7 | Split-pane multi-view, sync logs, shared memory (#45) | L |
| D-8 | Focus mode (#46) | S |
| D-9 | Theme engine: dark/light/auto + custom CSS vars (#47) | M |
| D-10 | Global notification center (#70) | M |
| D-11 | Fuzzy search + AI "find similar" (#71) | M |
| D-12 | Multi-monitor support (#72) | M |
| D-13 | Snapshot & restore desktop state (#73) | L |

---

## EPIC 4 — SDLC for Agents (M2, M3)

| # | Title | Size |
|---|---|---|
| S-1 | Git-like agent versioning, agents.json + .agentskitignore (#11) | L |
| S-2 | Eval suites + session replay + A/B prompt (#12) | L |
| S-3 | CI/CD pipeline templates (GitHub Actions) (#13) | M |
| S-4 | Deploy targets: local / cloud / docker / k8s (#14) | L |
| S-5 | Agent Auditor skill — security/cost/perf pre-deploy (#15) | M |
| S-6 | Changelog generator from agent diffs (#48) | M |
| S-7 | Dependency graph visualizer (#49) | M |
| S-8 | One-click fork agent/workspace (#50) | S |
| S-9 | Auto-doc generator + interactive demo link (#74) | M |
| S-10 | Security scan on deploy — prompt-injection + PII + deps (#75) | L |
| S-11 | Real-time co-edit collab mode (#76) | XL |
| S-12 | Auto-generated 15s release video (#77) | M |

---

## EPIC 5 — Pipeline Orchestrator (M3)

| # | Title | Size |
|---|---|---|
| P-1 | DAG engine, retry, checkpoint, parallel, HITL (#16) | XL |
| P-2 | `agentskit-os flow new` + visual editable template (#17) | M |
| P-3 | HITL UI — approve/reject/pause/resume + persistence (#19) | L |
| P-4 | Durable execution Temporal-style — survive crashes (#20) | XL |
| P-5 | Live debugger — step-through, mock injection, rewind (#51) | L |
| P-6 | Template gallery — 50+ ready flows (#52) | L |
| P-7 | Export/import pipelines as JSON (#53) | S |
| P-8 | LLM-decision branching nodes (#78) | M |
| P-9 | Cost-aware throttling (#79) | M |
| P-10 | Visual diff for pipeline versions (#80) | M |
| P-11 | Export pipeline as standalone exe / Docker image (#81) | L |

---

## EPIC 6 — Triggers (M4)

| # | Title | Size |
|---|---|---|
| T-1 | Cron triggers | S |
| T-2 | Webhook triggers | S |
| T-3 | File watcher triggers | S |
| T-4 | Email triggers | M |
| T-5 | Slack triggers | M |
| T-6 | Microsoft Teams triggers | M |
| T-7 | GitHub triggers (PR, issue, push) | M |
| T-8 | Linear ticket triggers | S |
| T-9 | Postgres / Supabase CDC triggers | L |
| T-10 | Trigger contract + plugin extension API (#18) | M |

---

## EPIC 7 — Integrations & Marketplace (M4, M5)

| # | Title | Size |
|---|---|---|
| I-1 | Visual Integration Hub — 1-click OAuth (#21) | L |
| I-2 | Marketplace inside OS — `npx agentskit publish` + 1-click install (#22) | XL |
| I-3 | Plugin system — Tauri plugins + React contributions (#23) | XL |
| I-4 | MCP Bridge v2 — publish AK tools as MCP, consume MCP (#24) | L |
| I-5 | MCP server auto-discover (#54) | M |
| I-6 | Featured section + ratings + usage stats (#55) | M |
| I-7 | Revenue-share dashboard (#56) | L |
| I-8 | AI connection suggester (#82) | M |
| I-9 | Third-party plugin store + verified badges + audit status (#83) | L |
| I-10 | One-click "Try in OS" from GitHub README (#84) | M |

---

## EPIC 8 — Generative & Meta (M7)

| # | Title | Size |
|---|---|---|
| G-1 | NL → agent + pipeline + trigger + tools generator (#25) | XL |
| G-2 | Agent Harness primitives — spawn/kill/migrate (#26) | L |
| G-3 | Multi-agent topologies UI — supervisor/swarm/hierarchical/blackboard (#27) | L |
| G-4 | Background agents + visual cron (#28) | M |
| G-5 | Embedded trace viewer + time-travel debug + replay (#29) | L |
| G-6 | Plugin extensibility (UI + triggers + dashboards) (#30) | L |
| G-7 | Meta-agent mode — agent orchestrates agents (#57) | L |
| G-8 | "What-if" simulator (#58) | L |
| G-9 | Agent cloning with variation (#59) | M |
| G-10 | Voice command mode (#85) | L |
| G-11 | Self-healing agents — debug clone after 3 crashes (#86) | L |
| G-12 | Cross-workspace agent sharing (#87) | M |
| G-13 | Evolutionary mode — genetic prompt/tool experiments (#88) | XL |

---

## EPIC 9 — Observability & Security (M6)

| # | Title | Size |
|---|---|---|
| O-1 | Trace viewer + Langfuse + PostHog OOTB (#31) | L |
| O-2 | Prompt firewall + PII redaction + mandatory sandbox (E2B/WebContainer) (#32) | L |
| O-3 | Signed audit log (SOC2/HIPAA ready) (#33) | L |
| O-4 | Cost guard + workspace quotas (#34) | M |
| O-5 | Anomaly detection — cost spikes + suspicious tool use (#60) | L |
| O-6 | Backup & restore — encrypted full-workspace export (#61) | M |
| O-7 | Real-time cost heat map (#89) | M |
| O-8 | Compliance export wizard — SOC2/HIPAA/GDPR (#90) | L |
| O-9 | Privacy vault — OS-level keychain + biometric unlock (#91) | L |

---

## EPIC 10 — UI & Experience (M2, M9)

| # | Title | Size |
|---|---|---|
| U-1 | shadcn + AgentsKitUI components: Chat, Agent Card, Flow Editor (#35) | L |
| U-2 | Voice mode + artifact rendering (#36) | L |
| U-3 | Mobile companion (RN) — post-GA (#37) | XL |
| U-4 | Onboarding tour with interactive examples (#62) | M |
| U-5 | Keyboard-first power-user shortcuts (#63) | M |
| U-6 | Custom dashboard widgets — drag metrics (#64) | M |
| U-7 | Immersive artifact viewer — code/charts/HTML sandbox (#92) | L |
| U-8 | Custom widget marketplace (#93) | L |
| U-9 | Accessibility first — screen reader, high contrast, keyboard-only (#94) | L |

---

## EPIC 11 — Cloud & Monetization (M8)

| # | Title | Size |
|---|---|---|
| M-1 | AgentsKitOS Cloud — hosted workspace sync (#38) | XL |
| M-2 | Free tier + Pro plan (#39) | M |
| M-3 | Enterprise self-host + SSO + air-gapped (#40) | XL |
| M-4 | Auto-update + rollback (#42) | M |
| M-5 | Workspace system — isolated personal/team/client (#43) | L |
| M-6 | Marketplace subscription tier (#65) | M |
| M-7 | Team seats + granular RBAC (#66) | L |
| M-8 | Sponsored tools + transparent revenue share (#95) | M |
| M-9 | Usage-based Cloud credits + seamless top-up (#96) | M |
| M-10 | Enterprise billing portal — per-seat / per-workspace / per-token (#97) | L |

---

## EPIC 12 — Wild Cards (post-GA, M10)

| # | Title | Size |
|---|---|---|
| W-1 | Carbon-aware orchestration — pick efficient triggers/models | L |
| W-2 | Evolutionary agent loop expansion | XL |
| W-3 | Agent-to-Agent open protocol | XL |
| W-4 | Certification program for verified agents | L |

---

## Total (snapshot): 13 + 9 + 13 + 12 + 11 + 10 + 10 + 13 + 9 + 9 + 10 + 4 = **123 issues**

## Labels

`epic:1..12`, `area:core|cli|desktop|flow|triggers|marketplace|plugins|observability|security|cloud|generative|collab|ui`, `prio:p0..p3`, `type:feat|fix|docs|chore|rfc|adr`, `size:s|m|l|xl`, `good-first-issue`, `help-wanted`, `community`, `dogfood`, `breaking`.

## Project Board Columns

**Backlog → Spec/RFC → Ready → In Progress → Review → QA/Eval → Released**

No issue moves to Ready without: spec doc, acceptance criteria, contract/Zod schema link (when applicable), test plan.
