---
"@agentskit/os-core": minor
---

Land RFC-0001 (Accepted): align `PluginConfig` with ADR-0006 capability model.

**Breaking (pre-1.0, no public consumers):**
- `PluginConfig.capabilities` → `PluginConfig.contributes` (same enum, clearer name)
- Type renamed: `PluginCapability` → `PluginContribution`

**Additive:**
- `PluginPermission` (resource + actions + reason + optional `CapabilityConstraints` + `required`) — manifest of grants the plugin requests at install time
- `PluginConfig.permissions: PluginPermission[]` (default `[]`)
- `WorkspaceConfig.limits` (`WorkspaceLimits`) — per-run + per-day token/USD caps, wall-clock, concurrency, max-steps
- `docs/COMPAT-MATRIX.md` — versioned OS↔AgentsKit compatibility matrix

Reason: pre-M1 collision between "what the plugin provides" (contributes) and ADR-0006 capability tokens (RBAC grants). Renaming now closes the door before public consumers exist.
