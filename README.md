# AgentsKitOS

OS-layer on top of [AgentsKit](https://github.com/AgentsKit-io/agentskit). Visual harness, SDLC, orchestrator, marketplace for agents. Configurable via YAML, GUI, or pure code. Same DNA: light core, modular, plug-and-play.

> **Foundation > speed.** Small, correct, documented deliveries. No shortcuts on contracts, ADRs, or tests.

## Status

Pre-alpha. Milestone **M1 — Core schemas + CLI alpha**. See [`ROADMAP.md`](./ROADMAP.md).

`@agentskit/os-core` ships Zod contracts only — no runtime yet. 223+ tests, <15 KB gzipped.

## Why

Existing agent OSes (Flowise, Langflow, n8n, Dify) optimized speed-of-shipping over contract stability. Result: drift, lock-in, abandoned plugins. We optimize the opposite. Slower visible progress; longer-lived ecosystem.

## Philosophy

1. `@agentskit/os-core` stays ultralight. Contracts + event bus + workspace model only. Zero LLM/UI deps. **<15 KB gzipped**.
2. Never duplicate AgentsKit. Import core/runtime/adapters/memory/tools/skills/observability/sandbox/rag/eval as deps. OS = thin layer.
3. Every package independently installable. Use one piece without the desktop.
4. Strict TS, no `any`. Zod at every boundary. Named exports only.
5. ADR before architecture. RFC before breaking contracts. Public process.
6. SemVer strict. Backward-compat within a major.
7. Native security + observability. Sandbox, audit log, trace viewer not optional.
8. Self-host day 1. Air-gap supported. MIT.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  AgentsKitOS                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  os-desktop  │ │   os-cli     │ │   os-flow    │ │ os-triggers│ │
│  │  (Tauri 2)   │ │              │ │  (DAG/HITL)  │ │            │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ │
│         │                │                │               │        │
│  ┌──────┴────────────────┴────────────────┴───────────────┴──────┐ │
│  │  @agentskit/os-core (Zod contracts, event bus, principal/cap, │ │
│  │  errors, workspace model, plugin manifest)                    │ │
│  └──────────────────────────────┬────────────────────────────────┘ │
│  ┌──────────────┐ ┌─────────────┴──┐ ┌──────────────┐ ┌──────────┐ │
│  │  os-security │ │ os-marketplace │ │ os-mcp-bridge│ │ os-cloud │ │
│  │  (vault++)   │ │  + os-plugins  │ │  (publish +  │ │  -sync   │ │
│  │              │ │                │ │   consume)   │ │          │ │
│  └──────────────┘ └────────────────┘ └──────────────┘ └──────────┘ │
└────────────────────────────────┬───────────────────────────────────┘
                                 │ peerDependency
┌────────────────────────────────┴───────────────────────────────────┐
│  AgentsKit (upstream)                                              │
│  core · runtime · adapters · memory · tools · skills · rag         │
│  observability · sandbox · eval · cli · ink · react · vue · svelte │
└────────────────────────────────────────────────────────────────────┘
```

OS owns: workspace, flow DAG + durable, triggers, marketplace, plugin host, MCP bridge v2, generative OS (NL→agent/flow), cloud sync, collab, desktop UX, vault++, signed audit log.

AgentsKit owns: LLM adapters, ReAct loop, memory backends, tools, skills, RAG, sandbox runtimes, observability primitives, eval. OS imports — never duplicates.

## What's covered from AgentsKit

| Concern | AgentsKit pkg | OS consumption |
|---|---|---|
| LLM adapters (30+: Anthropic, OpenAI, Azure, Bedrock, Gemini, Groq, Mistral, Ollama, vLLM, LangChain, Vercel AI, …) | `@agentskit/adapters` | as `provider` in workspace config |
| Runtime (ReAct, durable, background, delegates, topologies, speculate, shared-context) | `@agentskit/runtime` | flow engine consumes; multi-agent topologies feed RFC-0003 patterns |
| Memory (sqlite, turso, redis chat+vector, file chat+vector, graph, hierarchical, personalization, encrypted) | `@agentskit/memory` | as `MemoryConfig` backends + OS-level `vault` overlay |
| Tools — built-ins: filesystem, shell, fetch-url, web-search, slack, sqlite-query, mcp, discovery, zod | `@agentskit/tools` | exposed via `tools[]` config + plugin-extensible |
| Tools — integrations: airtable, browser-agent, cloudflare-r2, coingecko, confluence, deepgram, discord, document-parsers, elevenlabs, figma, firecrawl, github, github-actions, gmail, google-calendar, http, hubspot, jira, linear, linear-triage, maps, notion, openai-images, pagerduty, postgres, postgres-roles, reader, s3, sentry, shopify, slack, stripe, stripe-webhook, twilio, weather, whisper | `@agentskit/tools/integrations/*` | trigger sources + tool inventory in marketplace |
| Skills: coder, code-reviewer, pr-reviewer, planner, researcher, summarizer, translator, technical-writer, critic, compose, customer-support, data-analyst, finance, healthcare, marketplace, security-auditor, sql-analyst, sql-gen, discovery | `@agentskit/skills` | distribution via OS marketplace |
| RAG (chunker, loaders, rerank, rerankers, vector-store) | `@agentskit/rag` | wired into workspace schema as `rag:` block |
| Observability (OpenTelemetry, Langsmith, Datadog, Axiom, New Relic, audit-log, cost-guard + multi-tenant, token-counter, trace-tracker, trace-viewer, devtools, console-logger) | `@agentskit/observability` | RFC-0006 OTel `gen_ai.*` semconv, ADR-0008 audit chain extends `audit-log.ts`, ADR-0009 + WorkspaceLimits drive `cost-guard-multi-tenant` |
| Sandbox (e2b-backend, policy, types) | `@agentskit/sandbox` | ADR-0010 `SandboxRuntime` interface; e2b is built-in runtime |
| Eval | `@agentskit/eval` | trace replay + comparison node (RFC-0003 `compare`) |
| Frontend bindings | `@agentskit/{react,vue,svelte,solid,angular,ink,react-native}` | os-desktop M2 (React), os-cli (Ink), mobile companion M9 (React Native) |

## Gaps to upstream (contribute back per ADR-0002)

- **Email trigger** — Gmail tool exists upstream; generic SMTP/IMAP not yet. OS proposes upstream contribution before T-4.
- **Microsoft Teams** — not yet upstream; T-6 may seed.
- **Postgres CDC** — `@agentskit/tools/integrations/postgres.ts` is query-mode; CDC mode (T-9) requires upstream extension.
- **Graph reranker / advanced RAG patterns** — RAG primitives upstream; production-grade rerank pipelines may be OS-layer templates rather than core additions.

## Architecture Decision Records

Foundation:
- [ADR-0001 — Philosophy & non-negotiables](./docs/adr/0001-philosophy.md)
- [ADR-0002 — Depend on AgentsKit, never duplicate](./docs/adr/0002-depend-on-agentskit.md)
- [ADR-0003 — Config schema (Zod, layered)](./docs/adr/0003-config-schema.md)
- [ADR-0004 — Zod as peer dep](./docs/adr/0004-zod-as-peer-dep.md)

Contracts:
- [ADR-0005 — Event bus (CloudEvents)](./docs/adr/0005-event-bus.md)
- [ADR-0006 — Principal & capability-based RBAC](./docs/adr/0006-principal-rbac.md)
- [ADR-0007 — Structured error model](./docs/adr/0007-error-model.md)

Security & execution:
- [ADR-0008 — Audit log signing (Merkle chain)](./docs/adr/0008-audit-log-signing.md)
- [ADR-0009 — Run modes (real / preview / dry_run / replay / simulate / deterministic)](./docs/adr/0009-run-modes.md)
- [ADR-0010 — Tool side-effect declaration + sandbox levels](./docs/adr/0010-tool-side-effects-sandbox.md)
- [ADR-0011 — Egress default-deny + allowlist](./docs/adr/0011-egress-allowlist.md)
- [ADR-0012 — Plugin extension point catalog](./docs/adr/0012-plugin-extension-points.md)

## Requests for Comments (open / accepted)

- [RFC-0001 — Plugin permissions vs contributions (Accepted)](./docs/rfc/0001-plugin-capability-alignment.md)
- [RFC-0002 — `agentskit-os.lock` workspace lock file](./docs/rfc/0002-workspace-lock.md)
- [RFC-0003 — Multi-agent pattern nodes (compare / vote / debate / auction / blackboard)](./docs/rfc/0003-multi-agent-patterns.md)
- [RFC-0004 — BrandKit + content guardrails](./docs/rfc/0004-brand-kit.md)
- [RFC-0005 — Patient consent + break-glass](./docs/rfc/0005-consent-break-glass.md)
- [RFC-0006 — Adopt OpenTelemetry `gen_ai.*` semantic conventions](./docs/rfc/0006-otel-genai-semconv.md)

## Compatibility

OS↔AgentsKit version pinning + release process: [`docs/COMPAT-MATRIX.md`](./docs/COMPAT-MATRIX.md).

## Headline features (target 1.0)

| Axis | Target |
|---|---|
| Installer size | <15 MB |
| Cold start | <800 ms |
| Core gzipped | <15 KB |
| Time to first agent | <60 s |
| Provider lock-in | Zero |
| Self-host | Day 1 |
| Air-gap mode | First-class |
| Test coverage core | >90% |

Notable primitives:

- **3-way agent compare**, **vote**, **debate**, **auction**, **blackboard** flow nodes.
- **Run modes**: production, preview (read-only), dry-run (mocked), replay (time-travel), simulate, deterministic (regulated).
- **Branch-from-past-step** debugging.
- **Pre-flight cost estimate** + live token/$ counter.
- **BrandKit** for marketing agencies (tone, banned phrases, disclaimers, multi-client).
- **Patient consent + break-glass** for healthcare/finance.
- **Egress default-deny** with per-workspace allowlist.
- **Workspace lockfile** for byte-reproducible runs.
- **Signed audit log** (Merkle chain, HSM-ready) for SOC2 / HIPAA / GDPR.
- **OpenTelemetry `gen_ai.*` semconv** — works with Datadog / Honeycomb / Langfuse / PostHog / New Relic / Grafana out of the box.
- **MCP bridge v2** — publish AgentsKit tools as MCP servers, consume any MCP server.
- **Generative OS** — NL → agent / flow / trigger / tool generator.

## Personas

- **Healthcare / clinical** — air-gap + Safe-Harbor PII redaction + signed audit + consent + break-glass + determinism mode.
- **Coding / dev tooling** — repo-aware agents + multi-runtime sandbox + diff primitives + cost-per-PR + local-model fallback.
- **Marketing agency** — multi-client workspace isolation + BrandKit + approval HITL + per-client cost reporting.
- **Ops / SRE** — durable flows + cron + cdc triggers + cost heat map + anomaly detection.

## Repo layout

```
packages/
  os-core              # Zod contracts, event bus, principal/cap, errors, workspace model
  os-cli               # init, doctor, run, sync, deploy (planned M1)
  os-desktop           # Tauri 2 shell (planned M2)
  os-ui                # shadcn components: Dashboard, FlowEditor, TraceViewer, CommandPalette (planned M2)
  os-flow              # DAG engine, durable, checkpoint, HITL (planned M3)
  os-triggers          # cron, webhook, file, email, slack, github, linear, cdc (planned M4)
  os-marketplace       # publish/install, signing, revenue share (planned M5)
  os-plugins           # plugin SDK + plugin host (planned M5)
  os-observability     # trace viewer, replay, anomaly detect (planned M6)
  os-security          # prompt firewall, PII redact, audit log signing, vault (planned M6)
  os-cloud-sync        # workspace sync, backup/restore, multi-device (planned M8)
  os-generative        # NL→agent/flow generator (planned M7)
  os-collab            # CRDT real-time co-edit (planned M8)
  os-mcp-bridge        # publish AK tools as MCP, consume MCP servers (planned M4)

apps/
  desktop              # Tauri app (planned M2)
  cloud                # hosted control plane (planned M8)
  docs                 # fumadocs site

templates/
  starter-react · starter-ink · starter-headless · starter-team
  agency-client-content-approval · healthcare-triage · code-review-3-way
```

Config: `agentskit-os.config.ts` (Zod-validated, `defineConfig()` helper) + `workspace.yaml` per workspace + `agentskit-os.lock` (RFC-0002) + `.agentskitos/` runtime dir (sqlite, vault, traces).

## Quick start (planned M1)

```bash
# install once core+cli ship
pnpm add -D @agentskit/os-cli

# scaffold
pnpm agentskit-os init

# diagnose
pnpm agentskit-os doctor

# run a flow with cost estimate first
pnpm agentskit-os run pr-review --mode preview --estimate

# lock + ship
pnpm agentskit-os lock
pnpm agentskit-os deploy --target docker
```

## Contributing

- Issues + RFCs welcome.
- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the relevant ADR before opening a PR.
- Every PR ships: types, tests, docs, changeset.
- Architectural changes need an ADR. Breaking contract changes need an RFC.
- Security disclosures: [`SECURITY.md`](./SECURITY.md).

## License

MIT. See [`LICENSE`](./LICENSE).
