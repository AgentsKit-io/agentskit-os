---
"@agentskit/os-core": minor
---

feat(os-core): configurable PII categories with plugin extension

Resolves #201. Extracts `DEFAULT_PII_CATEGORIES` and updates `PiiCategory` to support dynamic injection via the `PluginRegistry` (extension point `pii-category` per ADR-0012). `parseSecurityConfig` and `safeParseSecurityConfig` now accept an optional `registry: PluginRegistry` argument to validate dynamic values against the registry at runtime.
