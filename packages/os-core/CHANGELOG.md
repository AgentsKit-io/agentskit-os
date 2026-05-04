# @agentskit/os-core

## 0.4.0-alpha.2

### Patch Changes

- 56a30a2: ADR-0018 — Desktop shell architecture (Tauri 2 + React + os-headless sidecar). Documents the IPC schema, bundling rules, and security boundaries.

  Part of Epic #3 (Desktop Harness). Refs #35 #36 #37 #43

## 0.4.0-alpha.1

### Minor Changes

- 84d2fed: feat(os-core): WorkspaceConfig.dataResidency field (#183)
  feat(os-core): RepoRef primitive — git URL + ref + worktree path (#189)
  feat(os-core): per-trigger budget override via effectiveLimitsFor (#192)
  docs(adr): CLI verb surface ADR-0017 + man-page generator (#181)

## 0.4.0-alpha.0

### Minor Changes

- 39d14db: Add cost meter primitive per ADR-0012 `cost-meter` extension point. Pure schema + computation; no live API calls in core. Pricing tables registered by plugins.

  `ModelPricing` Zod schema (provider + model + optional pinnedVersion + per-million input/output/cached-input rates + optional images-per-call + audio-per-second + Currency + effectiveFrom/effectiveTo windows + source URL).

  `computeCost(usage, pricing)` returns typed `CostBreakdown` (currency + per-component costs + total). Cached tokens auto-deducted from billable input.

  `CostMeter` class: register/unregister/lookup/meter. Falls back to unpinned model when pinnedVersion not registered. Honors `effectiveFrom`/`effectiveTo` time windows.

  `checkBudget(input, prospectiveCost?)` returns `BudgetDecision` (`within | exceeded`) with scope (`daily | monthly`), limit, projected spent. Daily takes precedence when both exceeded.

  `Currency` enum: USD/EUR/GBP/BRL/JPY/CNY.

  New subpath export `@agentskit/os-core/cost/cost-meter`.

- 4e2496a: Implement RFC-0006 OpenTelemetry GenAI semantic conventions. Pure constants + Zod validators; no OTel SDK dependency. Exporters in os-observability translate these into SDK calls.

  `GenAiAttr` namespace exposes stable attribute names (`gen_ai.system`, `gen_ai.operation.name`, `gen_ai.request.*`, `gen_ai.response.*`, `gen_ai.usage.*`, `server.*`, `error.type`). OS extensions namespaced under `agentskitos.*` (workspace_id, run_id, run_mode, agent_id, flow_id, node_id, principal_id, cost_usd, cache_hit, consent_ref_id, brand_kit_id) — covers gaps without forking the standard.

  `GEN_AI_OPERATION_NAMES` (chat/completion/embedding/tool/agent/rerank). `GEN_AI_FINISH_REASONS` (stop/length/tool_calls/content_filter/error). `GenAiSpanAttributes` Zod schema with passthrough for non-genai attributes. BigInt usage tokens auto-coerced to number.

  Adapter helpers: `buildRequestAttributes(req, hints?)`, `buildResponseAttributes(res, hints?)`, `spanName(op, target?)`. `SEMCONV_VERSION = '1.29.0'`.

  New subpath export `@agentskit/os-core/obs/gen-ai-semconv`.

- e496ac7: Add `RagConfig` Zod schema wiring `@agentskit/rag` (chunker, loaders, vector stores, rerankers, hybrid search) into `WorkspaceConfig`. New `AgentConfig.ragRefs` field binds agents to pipelines. Closes the RAG coverage gap (AgentsKit-io/agentskit-os#158).

  - 9 loader kinds: fs, web, pdf, notion, confluence, github, s3, firecrawl, plugin
  - 9 vector stores: sqlite, turso, redis, file, pgvector, qdrant, pinecone, weaviate, plugin
  - 7 reranker kinds: cohere, voyage, jina, cross-encoder, mmr, rrf, plugin
  - Hybrid search (BM25/TFIDF/SPLADE × dense)
  - ConfigRoot enforces unique pipeline ids + agent.ragRefs resolves to known pipelines

- aad7f5b: M1 polish: BrandKit OutputGuard, patient consent, air-gap enforcement, adapter fallback chain.

  Four issues shipped together to minimise schema conflict surface:

  **#195 — BrandKit + OutputGuard (RFC-0004)**
  `validateAgainstBrandKit` and `hasBlockingViolation` provide pure content-guard logic covering banned phrases (case-insensitive), required disclaimers, length limits, and capitalization rules. Multi-client override resolution via `BrandKit.client` slug. Full test coverage in `tests/brand/`.

  **#186 — Patient consent + break-glass (RFC-0005)**
  `checkConsent` enforces scope matching and TTL on `ConsentRef`. `evaluateBreakGlass` enforces two-person rule, TTL, and approved-reason list on `BreakGlassActivation`. Pure helpers — no I/O. Full test coverage in `tests/consent/`.

  **#184 — Air-gap mode enforcement**
  `airGapEnforce(policy, request)` decides whether telemetry, marketplace, cloudSync, externalLlm, or egress requests are permitted. When `policy.airGapped`, external LLMs are denied unless the provider is in `policy.localProviders`; egress is restricted to loopback (`localhost`, `127.0.0.1`, `::1`). Error code: `os.security.airgap_blocked`. Full test coverage in `tests/security/`.

  **#194 — Adapter fallback chain**
  `pickAdapter({ primary, fallbacks, available, preferLocal })` selects the first reachable provider. With `preferLocal: true`, local providers (tagged `local: true` on `FallbackEntry`) are preferred over network providers. Throws `NoAdapterAvailableError` (code `os.runtime.no_adapter_available`) when no provider is reachable. `AgentModelConfig.fallbackChain` field added. Full test coverage in `tests/runtime/`.

### Patch Changes

- 8167412: Internal: ADR-0014 publish vs bundle policy. Three distribution tiers — `public` (npm published, plugin authors compile against), `bundled-private` (`"private": true`, ships inside Tauri desktop bundle, not on npm), `internal-only` (tooling/fixtures, neither bundled nor published). All current packages declare `agentskitos.distribution: "public"`. CI lint `scripts/check-distribution.mjs` enforces field presence + private-flag pairing. No public API change.
- 9fedb8d: Land RFC-0007 (Pre-1.0 Contract Freeze).

  Defines three concentric rings of "public contract":

  - **Ring 0** — wire formats (AuditBatch JSONL/SQL, CheckpointRecord, event envelope, plugin manifest, bundle JSON, lockfile)
  - **Ring 1** — TypeScript public exports of `distribution: public` packages
  - **Ring 2** — semantic behaviors (deterministic event ordering per workspace, audit chain continuity, ed25519 signatures, ULID ids, RunMode outcomes)

  Pre-1.0: breakage allowed in minor bumps with changeset; post-1.0: breakage costs majors.

  Adds `scripts/check-public-api.mjs` enforcement:

  - Walks every `distribution: public` package
  - Parses `dist/index.d.ts` for top-level export names + kinds (function / class / interface / type / const / reexport)
  - Diffs against committed snapshots in `.agentskitos-api/<package>.json`
  - Names + kinds only — purely structural type changes are not flagged
  - Removed exports / kind changes → CI failure
  - New exports → informational; CI passes

  Initial snapshots committed for 14 in-tree public packages.

  New scripts:

  - `pnpm check:rfc-0007` — CI-side check
  - `pnpm api:update` — local-side refresh after intentional public-API change

- 2c2fd18: feat(os-flow): M1 polish — four issues in one PR

  **#205 — Event-sourced RunSnapshot for time-travel debug**

  - New `packages/os-flow/src/snapshot.ts`: `RunSnapshot` Zod schema with `runId`, `flowId`, `runMode`, `executedOrder`, `outcomes` (serialised as `[nodeId, outcome][]`), `enabledSet`, `startedAt`, `snapshotAt`.
  - `captureSnapshot()`, `outcomesFromSnapshot()`, `buildSnapshotEmitter()` helpers.
  - `RunOptions.snapshot?: SnapshotOptions` — host provides `onSnapshot` callback and optional `everyN` throttle.
  - Runner emits a snapshot after each node (or every N nodes).

  **#206 — Branch-from-past-step replay**

  - New `packages/os-flow/src/branch.ts`: `branchFromSnapshot()` validates that `branchPoint` is in `snapshot.executedOrder`, truncates history, returns `{ seedOutcomes, executedOrder, parentRunId, initialInput?, handlerOverrides? }`.
  - `RunOptions.seedOutcomes?: ReadonlyMap<string, NodeOutcome>` — seeded nodes are skipped by the runner; enabled set is re-derived from their outcomes.
  - Throws `FlowBranchError` (code `os.flow.invalid_branch_point`) for unknown branch points.

  **#188 — Two-person HITL approval**

  - New `packages/os-flow/src/human-handler.ts`: `createHumanHandler({ approverGate })` factory.
  - Host-injected `approverGate(node, ctx) => Promise<ApproverGateDecision>`.
  - Reads `node.quorum` (default 1) to require N signers; emits `paused` if insufficient signers, `failed` (code `os.flow.hitl_quorum_unmet`) on rejection or gate throw.
  - **os-core**: `HumanNode` gains `quorum: number` (default 1, max 32). Minimal surgical change.

  **#199 — Cost stream cancel signal (engine half; UI blocks on M2 desktop)**

  - `RunOptions.signal?: AbortSignal` — runner checks `signal.aborted` before each node.
  - Returns `{ status: 'cancelled', reason: 'os.flow.cancelled' }` immediately if aborted before or between nodes; completing run is a no-op.
  - Bus-bridge: new `run:cancelled` event kind maps to `flow.run.cancelled` CloudEvents envelope.
  - New error codes: `os.flow.invalid_branch_point`, `os.flow.cancelled`, `os.flow.hitl_quorum_unmet`.

## 0.3.0

### Minor Changes

- 5638f27: Land RFC-0004 (Accepted): `BrandKit` primitive + `validateAgainstBrandKit` output guard. Pure schema + decision logic; no LLM calls.

  `BrandKit` covers:

  - Voice (5 tones: formal/casual/playful/technical/empathetic, optional persona, good/bad examples)
  - Vocabulary (preferred-term substitution, banned phrases with `severity: warn | block`, required disclaimers with trigger words + placement, glossary)
  - Formatting (titleCase, oxfordComma, quoteStyle, emoji policy, length limits with per-channel overrides)
  - Identity (productName, legalName, capitalizationRules, pronouns)

  `validateAgainstBrandKit(text, kit, { channel? })` returns typed `BrandViolation[]` with codes `banned_phrase | preferred_term | missing_disclaimer | length_below_min | length_above_max | capitalization`. `hasBlockingViolation()` flags violations that should reject output.

  New subpath export `@agentskit/os-core/brand/brand-kit`.

- 90be5f3: Land RFC-0005 (Accepted): consent + break-glass primitives. Pure schema + decision logic.

  `Sensitivity` enum (7 levels: public/internal/confidential/pii/financial/legal-privileged/phi) with `compareSensitivity()` ordering and `requiresConsent()` helper.

  `ConsentRef` Zod schema (Ulid, subject hash, scope grammar `data:* | purpose:* | recipient:*`, ed25519 signed proof, jurisdiction tags, parent consent for amendments). `checkConsent(consent, requiredScope, now?)` returns `ConsentDecision` with codes `consent_missing | consent_expired | consent_scope_violation`.

  `BreakGlassActivation` schema (canonical reasons + org-extended slug, principal initiator, bypasses array `hitl|consent|cost-budget|egress-allowlist|rate-limit`, scope with duration + resources, postHocReview discriminated union `mandatory|team-queue`, ttl, optional twoPersonRule). `evaluateBreakGlass(activation, { now?, allowedExtraReasons? })` returns `BreakGlassDecision` with rejection codes `two_person_required | ttl_expired | unknown_reason_disallowed | no_bypasses_declared`. Two-person rule auto-required for `safety-of-life`.

  New subpath export `@agentskit/os-core/consent/consent`.

## 0.2.0

### Minor Changes

- 3a3a758: Add audit-log Merkle batch chain per ADR-0008. `AuditBatch` Zod schema with `prevBatchHash`, `merkleRoot`, `signedDigest`, `events: SignedEventRef[]`, and `signature` (ed25519). `AnchorRecord` for external anchoring (Rekor / git / custom URI). `AuditKeyCustody` enum (`local | hsm | external`). Pure helpers: `computeMerkleRoot()` (SHA-256 via Web Crypto, odd-count duplicates last), `computeBatchDigest()`, `verifyChain()` returns `{ ok: true } | { ok: false; break }` with typed `ChainBreak.code` (`genesis_invalid | prev_hash_mismatch | merkle_root_mismatch | digest_mismatch | signature_invalid`). Signature verification pluggable via `SignatureVerifier` interface — structural integrity always checked in-core. New subpath export `@agentskit/os-core/audit/batch`.
- ce66961: Add pure runtime helpers:

  - `auth/verify` — `verifyCapability(ctx, action, resource, now?)` returns `VerifyDecision = allow | deny`. Structural check only (no signature crypto — that lives in `os-security`). Implements wildcard suffix glob (`flow:*` matches `flow:pr-review:node:n1`) and expiry honoring `constraints.expiresAt`. Prefers a non-expired matching capability when multiple match.
  - `secrets/refs` — pure `${vault:key}` reference utilities. `findVaultRefs(input)` returns deduped key list; `resolveVaultRefs(input, resolver)` substitutes references via async pluggable resolver, caches lookups, records `resolvedKeys` and `missingKeys` (missing refs left in place rather than throwing — caller decides policy).

  New subpath exports `@agentskit/os-core/auth/verify` and `@agentskit/os-core/secrets/refs`.

- 14b572c: Add pure config utilities under `config/`:

  - `config/merge` — 5-layer merge per ADR-0003 (`defaults → global → workspace → env → runtime`). Plain-object deep merge; arrays replace, not concatenate. `buildProvenance` reports which layer set each leaf.
  - `config/migrate` — versioned migration framework. Strict 1-version increments via registered `MigrationStep[]`. Typed `MigrationError` codes (`config.future_version`, `config.migration_gap`, `config.migration_skip`, `config.migration_invalid_output`).
  - `config/diff` — structural diff over plain objects. Emits typed `ConfigChangeOp` (`add | remove | replace`). Arrays treated as opaque values. Powers `agentskit-os config diff` CLI command later.

  Pure functions only — no FS, no I/O. Loaders (TS/YAML/GUI/env/CLI) live in higher packages and feed objects here.

  New subpath exports `@agentskit/os-core/config/{merge,migrate,diff}`.

- d12e33e: Add `ConfigRoot` capstone schema. Composes Workspace, Vault, Security, Observability, optional Cloud, plus arrays of plugins, agents, flows, triggers, and a memory map. Validates cross-references via `superRefine`:

  - `workspace.schemaVersion` matches root `schemaVersion`
  - unique ids across plugins, agents, flows, triggers
  - every `trigger.flow` resolves to a real `flow.id`
  - every `flow.nodes[].agent` (for agent nodes) resolves to a real `agent.id`
  - every `agent.memory.ref` resolves to a key in the memory map
  - when `security.requireSignedPlugins` is true, every plugin must have a signature

  New subpath export `@agentskit/os-core/schema/config-root`. M1 schema layer is complete.

- 6ec36ab: Add egress allowlist primitives per ADR-0011. `EgressPolicy` Zod schema (mode `deny | allow`, allowlist + blocklist of `EgressGrant` strings, per-plugin overrides, optional outbound proxy with vault-aware mTLS cert). `checkEgress(policy, requested, pluginId?)` returns `EgressDecision = allow | deny`. Default blocklist covers cloud-metadata endpoints (169.254.169.254, metadata.google.internal), localhost, and link-local addresses. Bare `net:fetch:*` rejected at parse — explicit `net:fetch:any` required for opt-in. `SecurityConfig.egress` wires it into the workspace config tree. New subpath export `@agentskit/os-core/security/egress`.
- ecf6e45: Add `EventBus` interface + `InMemoryEventBus` reference implementation per ADR-0005. Topic-pattern matching: exact, single-segment wildcard (`agent.*`, `agent.*.completed`), or `*` for all events. Handler errors isolated via injectable `onHandlerError` sink. Async handlers awaited. `close()` prevents further publish/subscribe. New subpath export `@agentskit/os-core/events/bus`.
- b981e69: Add workspace lockfile primitives per RFC-0002. `Lockfile` Zod schema covers plugins (with sha512 integrity + ed25519 signature), agents (with model `pinnedVersion` + `contentHash` + optional `promptHash`), flows (with node-level tool/agent refs + versions), providers (with `apiVersion`), tools (with `sideEffects` + `contentHash`), templates, and `schemas` versions (osCore + workspaceConfig). Sub-resource integrity uses `sha256:<hex64>` and `sha512:<hex128>` formats validated via regex.

  Pure helpers: `canonicalJson()` (key-sorted JSON for hashing), `sha256OfCanonical()` (Web Crypto, returns `sha256:<hex64>`). `detectLockDrift()` returns typed `LockDriftIssue[]` with codes `plugin_version_mismatch | plugin_missing_in_lock | plugin_missing_in_workspace | config_hash_mismatch | agent_content_drift | flow_content_drift`.

  New subpath export `@agentskit/os-core/lockfile/lock`.

- f1b65fb: Land RFC-0003 (Accepted): five multi-agent pattern nodes added to `FlowNode` discriminated union.

  - `compare` — fan-out, side-by-side; selection mode `manual | eval | judge | first | all`
  - `vote` — odd-count consensus (zod superRefine); ballot `majority | weighted | unanimous | quorum`; `onTie=judge` requires `judgeAgent`
  - `debate` — proponent + opponent + judge; rounds 1–6; format `open | point-counterpoint | cross-examination`
  - `auction` — bidders compete on `lowest-cost | highest-confidence | fastest | custom`; reserve price + fallback + timeout
  - `blackboard` — shared scratchpad (in-memory / sqlite / memory-store ref); schedule `round-robin | volunteer | priority`; termination `rounds | consensus | agent-signal | budget`

  Strictly additive — existing flows still validate. New configs require new code to read.

- da7d3ce: Add plugin extension catalog per ADR-0012. 24 extension points enumerated (`trigger`, `tool`, `skill`, `agent-template`, `flow-node-kind`, `memory-backend`, `vault-backend`, `sandbox-runtime`, `egress-enforcer`, `obs-exporter`, `firewall-rule`, `output-guard`, `pii-category`, `run-mode`, `audit-signer`, `cost-meter`, `ui-panel`, `ui-widget`, `command-palette-action`, `mcp-bridge-adapter`, `migration-importer`, `template-pack`, `consent-policy`, `brand-kit-validator`).

  `stabilityOf(point)` returns `stable | experimental | internal` (4 experimental at v1: `flow-node-kind`, `consent-policy`, `brand-kit-validator`, `cost-meter`). `isHotReloadable(point)` reports whether registration changes apply without restart.

  `PluginEntrypoint` Zod schema (`id`, `extensionApi` semver range, `registers: ExtensionRegistration[]`). `PluginRegistry` class with conflict detection (different plugin claiming same `(point, id)` key returns typed `RegistryConflict`), idempotent self-update, scoped `unregisterPlugin`, point-filtered listing. `isApiCompatible(host, plugin)` checks major-version match. `EXTENSION_API_VERSION = '1.0'`.

  New subpath export `@agentskit/os-core/plugins/catalog`.

- 31eba8d: Add `RagConfig` schema. Composed of `ChunkerConfig` (5 strategies: fixed/sentence/paragraph/semantic/markdown), `EmbeddingsConfig` (provider + model + dimensions + batchSize), 4 loader kinds (`file`, `url`, `sql`, `api`) discriminated on `kind`, and `RetrieverConfig` (topK, similarityThreshold, hybridSearch, optional `RerankerConfig` for cohere/jina/voyage/cross-encoder/graph).

  `ConfigRoot.rag: RagConfig[]` (default `[]`). Cross-reference validation: every `rag.store` must point to a real key in `memory`. Unique-id check across the rag array.

  New subpath export `@agentskit/os-core/schema/rag`. Closes the AGENTSKIT-COVERAGE action item for RAG primitives in os-core.

- 51c6f12: Land RFC-0001 (Accepted): align `PluginConfig` with ADR-0006 capability model.

  **Breaking (pre-1.0, no public consumers):**

  - `PluginConfig.capabilities` → `PluginConfig.contributes` (same enum, clearer name)
  - Type renamed: `PluginCapability` → `PluginContribution`

  **Additive:**

  - `PluginPermission` (resource + actions + reason + optional `CapabilityConstraints` + `required`) — manifest of grants the plugin requests at install time
  - `PluginConfig.permissions: PluginPermission[]` (default `[]`)
  - `WorkspaceConfig.limits` (`WorkspaceLimits`) — per-run + per-day token/USD caps, wall-clock, concurrency, max-steps
  - `docs/COMPAT-MATRIX.md` — versioned OS↔AgentsKit compatibility matrix

  Reason: pre-M1 collision between "what the plugin provides" (contributes) and ADR-0006 capability tokens (RBAC grants). Renaming now closes the door before public consumers exist.

- 66066b1: Add run-mode runtime contracts per ADR-0009. Six modes: `real`, `preview`, `dry_run`, `replay`, `simulate`, `deterministic`. Each has a `RunModePolicy` (llm source, side-effects scope, state persistence, cost charging). `escalationRule(from, to)` returns one of `allowed | allowed-with-hitl | forbidden-must-branch | forbidden-must-reauthor | forbidden-must-demote`. `checkDeterminism()` reports typed `DeterminismIssue`s for non-zero temperature, unpinned models, missing tool stubs, and uncontrolled randomness. `RunContext` Zod schema (runMode + workspaceId + runId + parentRunId + startedAt). New subpath export `@agentskit/os-core/runtime/run-mode`.
- 2201a66: Add tool side-effects + sandbox levels per ADR-0010.

  `tools/side-effects`: 5-level taxonomy `none | read | write | destructive | external`. `maxSeverity()` aggregates multi-effect tools (defaults to `external` for empty list — most restrictive). `decideToolAction(mode, effects)` resolves the full RunMode × SideEffect policy table from ADR-0009, returning a typed `ModeAction` (`run | run-with-audit | run-with-audit-and-egress-check | block | stub | replay | replay-no-op | mocked | run-require-fixture`).

  `tools/sandbox`: 5-level isolation enum `none | process | container | vm | webcontainer`. `MIN_SANDBOX_FOR` policy matrix. `decideSandbox(effects, requested?, force?)` returns `apply | reject`. Workspace can elevate above minimum freely; weakening below minimum requires `force: true` (warning logged). `SandboxRuntime` interface for plugin-registered runtimes. `ToolManifest` Zod schema (id + name + sideEffects[] + optional minSandbox).

  New subpath exports `@agentskit/os-core/tools/side-effects` and `@agentskit/os-core/tools/sandbox`.

## 0.1.0

### Minor Changes

- b2c2867: Add `AgentConfig` Zod schema and shared `_primitives` module (`Slug`, `Tag`, `TagList`, `VaultSecretRef`). Workspace schema refactored to consume primitives. New subpath export `@agentskit/os-core/schema/agent`.
- 6df996b: Add `CloudSyncConfig` schema. Plans (free/pro/team/enterprise/self-hosted), sync strategies (off/manual/auto/realtime), conflict resolution, SSO (google/github/okta/azure-ad/saml), air-gap mode, RBAC team seats. New subpath export `@agentskit/os-core/schema/cloud`.
- 6df996b: Add three contract families: `events/event` (CloudEvent-style envelope with workspaceId/principalId/traceId/spanId, ULID ids, dot-namespaced types, agentskitos:// schema URIs), `auth/principal` + `auth/capability` (discriminated Principal: user/agent/plugin/trigger/system/service; capability tokens with rateLimit/budget/expiresAt constraints and ed25519 proof; AuthContext compose), `errors/codes` + `errors/error` (`OsErrorEnvelope` with category/code/retryable/cause-chain/traceId, `ERROR_SCHEMA_VERSION`). New subpath exports under `events/`, `auth/`, `errors/`.
- 2e0021d: Add `FlowConfig` Zod schema with DAG validation. 5 node kinds (`agent`, `tool`, `human`, `condition`, `parallel`) discriminated on `kind`. Edges validated for missing endpoints, duplicate node ids, and cycles via `superRefine`. Includes shared `RetryPolicy`. New subpath export `@agentskit/os-core/schema/flow`.
- 758b234: Add `MemoryConfig` discriminated union over 6 backends: `in-memory`, `file`, `sqlite`, `redis`, `vector` (lancedb/pgvector/qdrant/pinecone/weaviate), `localstorage`. Embeddings sub-config for vector stores. Vault-aware connection strings. New subpath export `@agentskit/os-core/schema/memory`.
- eb91033: Add `ObservabilityConfig` and `SecurityConfig` schemas. Observability: trace exporters (console/langfuse/posthog/otlp/file), cost quotas, anomaly detection. Security: prompt firewall, PII redaction (9 categories), sandbox (e2b/webcontainer/docker, network scope), signed audit log (ed25519/hmac-sha256), `requireSignedPlugins`. New subpath exports `@agentskit/os-core/schema/observability` and `/schema/security`.
- 859bdaa: Add `PluginConfig` and `VaultConfig` schemas. Plugin: capability declarations (tool/trigger/skill/memory/ui-panel/ui-widget/observability), source schemes (npm/github/marketplace/file), optional ed25519/rsa-sha256 signature, SemVer version. Vault: discriminated union over backends (file/os-keychain/env/external) with autolock and biometric flags. New subpath exports `@agentskit/os-core/schema/plugin` and `/schema/vault`.
- c5ba54c: Land RFC-0001 (Accepted): align `PluginConfig` with ADR-0006 capability model.

  **Breaking (pre-1.0, no public consumers):**

  - `PluginConfig.capabilities` → `PluginConfig.contributes` (same enum, clearer name)
  - Type renamed: `PluginCapability` → `PluginContribution`

  **Additive:**

  - `PluginPermission` (resource + actions + reason + optional `CapabilityConstraints` + `required`) — manifest of grants the plugin requests at install time
  - `PluginConfig.permissions: PluginPermission[]` (default `[]`)
  - `WorkspaceConfig.limits` (`WorkspaceLimits`) — per-run + per-day token/USD caps, wall-clock, concurrency, max-steps
  - `docs/COMPAT-MATRIX.md` — versioned OS↔AgentsKit compatibility matrix

  Reason: pre-M1 collision between "what the plugin provides" (contributes) and ADR-0006 capability tokens (RBAC grants). Renaming now closes the door before public consumers exist.

- ff10c4e: Add `TriggerConfig` discriminated union covering eight kinds: `cron`, `webhook`, `file`, `email`, `slack`, `github`, `linear`, `cdc`. New subpath export `@agentskit/os-core/schema/trigger`.
- 809c786: Add `WorkspaceConfig` Zod schema (M1, first contract). Exposes `WorkspaceConfig`, `WorkspaceIsolation`, `parseWorkspaceConfig`, `safeParseWorkspaceConfig`, and `SCHEMA_VERSION`. Zod is a `peerDependency` per ADR-0004.

### Patch Changes

- b763b6d: Initial M0 placeholder. No public API yet — contracts land in M1. Package exists to validate the build/release pipeline.
