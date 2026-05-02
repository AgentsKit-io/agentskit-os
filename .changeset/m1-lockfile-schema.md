---
"@agentskit/os-core": minor
---

Add workspace lockfile primitives per RFC-0002. `Lockfile` Zod schema covers plugins (with sha512 integrity + ed25519 signature), agents (with model `pinnedVersion` + `contentHash` + optional `promptHash`), flows (with node-level tool/agent refs + versions), providers (with `apiVersion`), tools (with `sideEffects` + `contentHash`), templates, and `schemas` versions (osCore + workspaceConfig). Sub-resource integrity uses `sha256:<hex64>` and `sha512:<hex128>` formats validated via regex.

Pure helpers: `canonicalJson()` (key-sorted JSON for hashing), `sha256OfCanonical()` (Web Crypto, returns `sha256:<hex64>`). `detectLockDrift()` returns typed `LockDriftIssue[]` with codes `plugin_version_mismatch | plugin_missing_in_lock | plugin_missing_in_workspace | config_hash_mismatch | agent_content_drift | flow_content_drift`.

New subpath export `@agentskit/os-core/lockfile/lock`.
