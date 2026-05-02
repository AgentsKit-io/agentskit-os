# @agentskit/os-core

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
