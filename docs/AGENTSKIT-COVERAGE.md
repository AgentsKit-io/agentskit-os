# AgentsKit Coverage Audit

Snapshot of every package + module in [AgentsKit](https://github.com/AgentsKit-io/agentskit) and how AgentsKitOS consumes / extends / contributes back. Living doc; updated whenever AgentsKit lands a new module or OS adds a consumer.

## Packages

### `@agentskit/adapters` — LLM providers

**Upstream**: anthropic, openai, openai-compatible, azure-openai, bedrock, cerebras, cohere, deepseek, fireworks, gemini, vertex, grok, groq, huggingface, kimi, langchain, llamacpp, lmstudio, mistral, ollama, openrouter, replicate, together, vercel-ai, vllm, webllm. Plus: `bail`, `ensemble`, `fallback`, `router`, `mock`, `embedders/*`, `createAdapter`, `generic`.

**OS consumption**: `ProviderRef` in workspace config maps directly. RFC-0002 lockfile pins provider snapshot id. ADR-0009 deterministic mode requires adapter to support `seed` + version pin.

**Status**: full coverage. No duplication.

### `@agentskit/runtime`

**Upstream modules**: `runner`, `background`, `delegates`, `durable`, `shared-context`, `speculate`, `topologies`, `types`.

**OS consumption**:
- `runner` ← `os-flow` engine ReAct steps.
- `durable` ← flow checkpointing (M3 P-4) — **upstream already exists**, OS uses it; no duplication.
- `topologies` ← RFC-0003 multi-agent nodes (compare/vote/debate/auction/blackboard) compose runtime topology primitives.
- `background` ← G-4 background agents.
- `delegates` ← supervisor / sub-agent spawning, ADR-0006 attenuated capability delegation.
- `shared-context` ← `BlackboardNode` scratchpad (RFC-0003).
- `speculate` ← speculative execution mode for low-latency UX.

**Status**: covered. RFC-0003 explicitly composes upstream topologies.

### `@agentskit/memory`

**Upstream**: `sqlite`, `turso`, `redis-chat`, `redis-vector`, `redis-client`, `file-chat`, `file-vector`, `vector-store`, `vector/*`, `graph`, `hierarchical`, `personalization`, `encrypted`.

**OS consumption**: `MemoryConfig` in workspace schema accepts each. OS adds:
- Workspace-level **vault overlay** (`os-security`) for keys the memory layer needs.
- Lockfile pins memory backend version + schema (RFC-0002).
- Encrypted memory (`encrypted.ts`) reused by HIPAA-mode workspaces (RFC-0005 sensitivity classes).

**Status**: full coverage.

### `@agentskit/tools` — built-ins

**Upstream**: `discovery`, `fetch-url`, `filesystem`, `shell`, `slack`, `sqlite-query`, `web-search`, `mcp`, `zod`.

**OS consumption**: each becomes a `Tool` with declared `sideEffects` (ADR-0010):

| Tool | Side effect | Default sandbox |
|---|---|---|
| `discovery` | none | none |
| `fetch-url` | external | container (egress allowlist per ADR-0011) |
| `filesystem` (read) | read | process |
| `filesystem` (write) | write | process |
| `shell` | destructive | container |
| `slack` | external + write | container |
| `sqlite-query` | read or write | process |
| `web-search` | external | container |
| `mcp` | varies (declared by MCP server) | varies |
| `zod` | none | none |

**Status**: covered. OS adds metadata (sideEffects, sandbox level).

### `@agentskit/tools/integrations` — third-party

**Upstream (35+)**: `airtable`, `browser-agent`, `cloudflare-r2`, `coingecko`, `confluence`, `deepgram`, `discord`, `document-parsers`, `elevenlabs`, `figma`, `firecrawl`, `github`, `github-actions`, `gmail`, `google-calendar`, `http`, `hubspot`, `jira`, `linear`, `linear-triage`, `maps`, `notion`, `openai-images`, `pagerduty`, `postgres`, `postgres-roles`, `reader`, `s3`, `sentry`, `shopify`, `slack`, `stripe`, `stripe-webhook`, `twilio`, `weather`, `whisper`.

**OS triggers map** (M4):

| OS trigger | AgentsKit source | Status |
|---|---|---|
| `cron` | OS-native (no upstream needed) | OS-side |
| `webhook` | `http` + `stripe-webhook` style | partial — OS adds ingress server |
| `file` | `filesystem` watch | OS-side wrapper |
| `email` | `gmail` (Gmail-only) | **gap** — needs generic SMTP/IMAP upstream |
| `slack` | `slack` integration | covered (event subscription mode) |
| `teams` | — | **gap** — propose upstream |
| `github` (PR/issue/push) | `github` + `github-actions` | covered |
| `linear` | `linear` + `linear-triage` | covered |
| `postgres CDC` | `postgres` (query-mode) | **gap** — CDC mode needed upstream |
| `discord` | `discord` | bonus, add to T-* |
| `twilio` (SMS/voice) | `twilio` | bonus |
| `sentry` (error events) | `sentry` | bonus |
| `pagerduty` (incidents) | `pagerduty` | bonus |
| `stripe` (payment events) | `stripe-webhook` | bonus |
| `s3` / `cloudflare-r2` (object events) | `s3`, `cloudflare-r2` | bonus |
| `figma` (file changes) | `figma` | bonus |

**Tools available out-of-box for marketplace listing**: all 35+ integrations + 9 built-ins = 44+ tools day-1.

**Status**: most triggers covered. 3 explicit gaps to upstream.

### `@agentskit/skills`

**Upstream**: `code-reviewer`, `coder`, `compose`, `critic`, `customer-support`, `data-analyst`, `discovery`, `finance`, `healthcare`, `marketplace`, `planner`, `pr-reviewer`, `researcher`, `security-auditor`, `sql-analyst`, `sql-gen`, `summarizer`, `technical-writer`, `translator`.

**OS consumption**: distributed via marketplace (M5). Domain skill alignment:

- **Healthcare**: `healthcare`, `summarizer`, `customer-support` → templates + RFC-0005 consent integration.
- **Coding**: `coder`, `code-reviewer`, `pr-reviewer`, `security-auditor`, `sql-analyst`, `sql-gen` → P-6 starter pack.
- **Marketing**: `compose`, `technical-writer`, `translator`, `customer-support`, `critic` → RFC-0004 BrandKit integration.
- **Ops**: `data-analyst`, `finance`, `planner`, `researcher`.

**Status**: full coverage. OS adds distribution + marketplace ranking + capability prompts.

### `@agentskit/observability`

**Upstream**: `opentelemetry`, `langsmith`, `datadog`, `axiom`, `new-relic`, `audit-log`, `cost-guard`, `cost-guard-multi-tenant`, `token-counter`, `trace-tracker`, `trace-viewer`, `devtools`, `console-logger`.

**OS consumption + extension**:
- `opentelemetry` ← RFC-0006 standardizes `gen_ai.*` semconv on top.
- `langsmith` / `datadog` / `axiom` / `new-relic` ← exposed as built-in `obs-exporter` plugins (ADR-0012).
- `audit-log` ← ADR-0008 extends with Merkle hash chain + signing modes (local/HSM/external).
- `cost-guard` + `cost-guard-multi-tenant` ← consumed by `WorkspaceLimits` (already in core schema). Multi-tenant variant maps to multi-workspace agencies (RFC-0004 client tagging).
- `token-counter`, `trace-tracker`, `trace-viewer`, `devtools` ← desktop M2 trace UI consumes directly.
- `console-logger` ← default in dev mode.

**Status**: full coverage. OS extends, never duplicates.

### `@agentskit/sandbox`

**Upstream**: `e2b-backend`, `policy`, `sandbox`, `tool`, `types`.

**OS consumption**:
- e2b is a built-in `sandbox-runtime` (ADR-0010, ADR-0012).
- `policy` ← composed with OS egress allowlist (ADR-0011).
- `sandbox` interface = `SandboxRuntime` plugin contract.
- OS adds: container, vm, webcontainer, process tiers as plugins.

**Status**: covered. OS provides catalog of additional runtimes.

### `@agentskit/rag`

**Upstream**: `chunker`, `loaders`, `rerank`, `rerankers`, `vector-store`, `rag`, `types`.

**OS consumption**: `RagConfig` schema in `os-core` wires upstream into workspace. 9 loader kinds (fs, web, pdf, notion, confluence, github, s3, firecrawl, plugin), 9 vector stores (sqlite, turso, redis, file, pgvector, qdrant, pinecone, weaviate, plugin), 7 reranker kinds, hybrid search. `AgentConfig.ragRefs` binds agents to pipelines. ConfigRoot validates references.

**Status**: covered.

### `@agentskit/eval`

**Upstream**: full eval harness.

**OS consumption**:
- S-2 eval suites + session replay.
- RFC-0003 `compare` node with `mode: 'eval'` consumes eval harness for auto-winner selection.
- Determinism mode (ADR-0009) uses eval for regression checks.

**Status**: covered.

### `@agentskit/cli`

**Upstream**: AgentsKit CLI (agent run, chat, eval).

**OS consumption**: `os-cli` is **separate** — handles workspace mgmt, flow, trigger, plugin install, deploy, lock, doctor. Boundary documented in:

| Verb | Owner |
|---|---|
| `agent run` / `chat` / `eval` | `agentskit` (upstream CLI) |
| `init`, `doctor`, `sync`, `lock`, `deploy`, `flow new/run`, `trigger ls`, `plugin install`, `publish`, `audit verify` | `os-cli` |

**Status**: clear boundary. No duplication.

### `@agentskit/ink` + framework bindings (`react`, `vue`, `svelte`, `solid`, `angular`, `react-native`)

**Upstream**: framework-specific hooks + components for chat / agent UI.

**OS consumption**:
- `os-cli` interactive surfaces consume `@agentskit/ink`.
- `os-desktop` (Tauri + React) consumes `@agentskit/react`.
- M9 mobile companion consumes `@agentskit/react-native`.
- Other bindings → community starters (`templates/starter-vue` etc.).

**Status**: full coverage.

### `@agentskit/templates`

**Upstream**: starter templates.

**OS consumption**: `templates/` in OS repo extends with persona-specific kits:
- `agency-client-content-approval`
- `healthcare-triage`
- `code-review-3-way`
- (P-6 50+ flow templates)

**Status**: extends.

### `@agentskit/core`

**Upstream**: shared types + utilities.

**OS consumption**: `os-core` peer-depends. Naming distinct (`@agentskit/core` ≠ `@agentskit/os-core`).

**Status**: covered.

## Coverage summary

| Concern | Coverage | Notes |
|---|---|---|
| LLM adapters | 100% | 30+ providers via upstream |
| Memory backends | 100% | sqlite/turso/redis/file/graph/hierarchical/encrypted |
| Built-in tools | 100% | side-effects + sandbox metadata added by OS |
| Integration tools | 100% (35+) | OS triggers map to most |
| Skills | 100% | 19 upstream + marketplace distribution |
| Observability | 100% | OS extends with semconv + audit chain |
| Sandbox | 100% (e2b) + OS adds 4 more tiers as plugins |
| RAG | 100% — `schema/rag.ts` ships in os-core |
| Eval | 100% via consumer + RFC-0003 |
| Frontend | 100% across 7 frameworks |
| **Triggers** | ~80% — gaps: generic email, Teams, postgres CDC |

## Action items

1. ~~**Add `schema/rag.ts`** to os-core M1~~ — done (#158).
2. **Upstream contribution**: generic SMTP/IMAP email tool (blocks T-4 email trigger).
3. **Upstream contribution**: Microsoft Teams integration (T-6).
4. **Upstream contribution**: postgres CDC mode (T-9).
5. **Expand triggers list** (T-* in EPICS): add discord, twilio, sentry, pagerduty, stripe, s3 — all already exist as upstream tools, just need trigger wrappers.
6. **Lockfile (RFC-0002)** must capture all consumed AgentsKit pkg versions in addition to OS plugins.
7. **Compat matrix** (`docs/COMPAT-MATRIX.md`) — populate per-package ranges as M1 ships.
