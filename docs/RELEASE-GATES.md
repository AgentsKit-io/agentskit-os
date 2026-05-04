# Release Readiness Gates

> Closes #371. Living doc — updates as items move to Done.
>
> Source of truth for blocking issues: [Project board](https://github.com/orgs/AgentsKit-io/projects/2/views/1).
> Roadmap context: [`ROADMAP.md`](../ROADMAP.md). Hard rules apply at every gate.

Three gates: **Alpha**, **Beta**, **GA**. A gate is met only when every checkbox in its section is true. Slipping a date is acceptable; skipping a checkbox is not.

---

## Alpha — "core works end-to-end for one developer on one machine"

Target: end of M2 (week 14).

### Core contracts (`@agentskit/os-core`)
- [x] Zod schemas for `Workspace`, `Agent`, `Flow`, `Trigger`, `Plugin`, `Vault`, `ConfigRoot` — #334, #339
- [x] `os-core` gzipped <15 KB (size-budget guard in CI) — ADR-0013
- [x] No `any`, named exports only, strict TS

### Headless runtime
- [ ] `@agentskit/os-headless` package — runs an agent from `agentskit-os.config.ts` with no UI — #223
- [ ] SQLite memory adapter wired through `os-runtime-agentskit`
- [ ] Eval harness ports `@agentskit/eval` and runs in CI

### CLI
- [x] `init`, `doctor`, `run`, `sync`, `wizard` commands ship and pass tests
- [x] CLI verb surface ADR-0017 + man-page generator — #181
- [ ] `init` produces a config that `run` executes without manual edits

### Desktop (M2 alpha exit)
- [ ] Tauri 2 shell installer <15 MB — #35
- [ ] Dashboard, command palette, agent cards, live trace, system tray
- [ ] Cold start <800 ms

### Quality
- [ ] `os-core` test coverage ≥90%
- [ ] `pnpm -r test && pnpm -r lint && pnpm -r build` green on CI
- [ ] Size-budget guard enforced for `os-core`, `os-cli`, `os-ui`

### Docs + governance
- [x] All ADRs through 0019 merged
- [ ] Quickstart: clone → `init` → first agent in <60 s, scripted in CI
- [ ] CONTRIBUTING, SECURITY, LICENSE, CODE_OF_CONDUCT in repo root

### Demo
- [ ] Public alpha tag `0.x.0-alpha.1` cut via changesets
- [ ] One scripted screencast: install → run agent → see trace

---

## Beta — "teams can adopt it for non-critical workloads"

Target: end of M6 (week 37).

### Flow orchestrator (M3)
- [ ] DAG engine + durable execution (Temporal-style checkpointing) — #63
- [ ] HITL approve/reject/pause/resume + persistence — #62
- [ ] Visual editor (React Flow), YAML/TS round-trip — #61
- [ ] Live debugger, step-through, mock injection — shipped (#381)
- [ ] 10 starter templates — #338, #61

### Triggers + integrations (M4)
- [ ] Cron, webhook, file watcher, email, Slack, GitHub, Linear, Postgres CDC
- [ ] OAuth hub
- [ ] MCP bridge v2 (publish + consume + auto-discover)

### Marketplace + plugins (M5)
- [ ] Plugin SDK (UI + trigger + dashboard contributions)
- [ ] `agentskit-os publish`, signing, install flow
- [ ] At least one verified third-party plugin installable

### Observability + security (M6)
- [ ] Trace viewer, time-travel replay
- [ ] Anomaly detect + cost heat map
- [ ] Prompt firewall, PII redaction
- [ ] Sandbox enforcement (ADR-0010, ADR-0011)
- [ ] Signed audit log (ADR-0008)
- [ ] Encrypted vault with biometric unlock

### Quality gates
- [ ] All public packages independently `pnpm install`-able
- [ ] No package depends on a private internal export
- [ ] Test coverage ≥85% across `os-*` packages
- [ ] CI matrix: macOS, Linux, Windows
- [ ] No critical or high CVEs in `pnpm audit --prod`

### Docs
- [ ] One full reference site (`apps/docs`) live with API + cookbook
- [ ] Migration guides drafted for LangChain and n8n
- [ ] Compatibility matrix (`docs/COMPAT-MATRIX.md`) covers every supported adapter

### Tag
- [ ] `0.x.0-beta.1` published via changesets, install verified from npm

---

## GA — "production-ready, enterprise-adoptable, certifiable"

Target: end of M9 (week 56).

### Differentiator targets (must hit)
- [ ] Installer size <15 MB
- [ ] Cold start <800 ms
- [ ] `os-core` gzipped <15 KB
- [ ] Time to first agent <60 s
- [ ] Zero provider lock-in (verified via adapter swap test)
- [ ] Day-1 self-host (one-shot Docker compose + Helm chart)
- [ ] OSS license MIT
- [ ] `os-core` test coverage >90%

### Self-host
- [ ] Docker compose runs full control plane offline
- [ ] Helm chart deploys to a single-node k3s cluster
- [ ] Backup/restore documented + tested with restore-time SLA

### Security
- [ ] Third-party penetration test passed, findings remediated
- [ ] SOC2 control mapping documented
- [ ] HIPAA + GDPR export wizards shipped
- [ ] Audit log signing keys rotatable without downtime
- [ ] Secrets vault: zero plaintext at rest, key derivation documented

### Marketplace trust
- [ ] Plugin signing required for verified badge
- [ ] Automated security audit pipeline runs on every published version
- [ ] Revenue share dashboard live with payout history
- [ ] Take-down + abuse process documented

### Accessibility
- [ ] WCAG 2.1 AA on every shipped UI surface (`docs/a11y-checklist.md`)
- [ ] Keyboard-only path verified for: dashboard, flow editor, command palette, marketplace
- [ ] Screen-reader pass on macOS VoiceOver and NVDA

### Migration assistants
- [ ] LangChain → AgentsKitOS importer works on top-10 templates
- [ ] n8n, Dify, Flowise importers ship with smoke tests

### Support + commercial
- [ ] Public roadmap, public RFC process, public ADR log
- [ ] SemVer policy enforced by `changesets` + breaking-change RFC gate
- [ ] Certification program launched with at least one partner
- [ ] Cloud hosted plan + billing portal + usage credits live

### Tag
- [ ] `1.0.0` published, signed release notes, archived in `apps/docs`
- [ ] All `os-*` packages reach `1.0.0` simultaneously

---

## How this doc is maintained

- Each checkbox links (or will link) to a tracking issue on the board.
- When an issue moves to Done, flip the checkbox in the same PR.
- New scope additions require either an ADR or an RFC and an entry here.
- A gate cannot be declared met by anyone other than a release manager review on a PR that ticks the final box.
