---
"@agentskit/os-core": minor
---

Add `PluginConfig` and `VaultConfig` schemas. Plugin: capability declarations (tool/trigger/skill/memory/ui-panel/ui-widget/observability), source schemes (npm/github/marketplace/file), optional ed25519/rsa-sha256 signature, SemVer version. Vault: discriminated union over backends (file/os-keychain/env/external) with autolock and biometric flags. New subpath exports `@agentskit/os-core/schema/plugin` and `/schema/vault`.
