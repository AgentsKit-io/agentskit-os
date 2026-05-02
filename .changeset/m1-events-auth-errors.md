---
"@agentskit/os-core": minor
---

Add three contract families: `events/event` (CloudEvent-style envelope with workspaceId/principalId/traceId/spanId, ULID ids, dot-namespaced types, agentskitos:// schema URIs), `auth/principal` + `auth/capability` (discriminated Principal: user/agent/plugin/trigger/system/service; capability tokens with rateLimit/budget/expiresAt constraints and ed25519 proof; AuthContext compose), `errors/codes` + `errors/error` (`OsErrorEnvelope` with category/code/retryable/cause-chain/traceId, `ERROR_SCHEMA_VERSION`). New subpath exports under `events/`, `auth/`, `errors/`.
