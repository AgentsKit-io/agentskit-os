---
"@agentskit/os-core": minor
---

Add plugin extension catalog per ADR-0012. 24 extension points enumerated (`trigger`, `tool`, `skill`, `agent-template`, `flow-node-kind`, `memory-backend`, `vault-backend`, `sandbox-runtime`, `egress-enforcer`, `obs-exporter`, `firewall-rule`, `output-guard`, `pii-category`, `run-mode`, `audit-signer`, `cost-meter`, `ui-panel`, `ui-widget`, `command-palette-action`, `mcp-bridge-adapter`, `migration-importer`, `template-pack`, `consent-policy`, `brand-kit-validator`).

`stabilityOf(point)` returns `stable | experimental | internal` (4 experimental at v1: `flow-node-kind`, `consent-policy`, `brand-kit-validator`, `cost-meter`). `isHotReloadable(point)` reports whether registration changes apply without restart.

`PluginEntrypoint` Zod schema (`id`, `extensionApi` semver range, `registers: ExtensionRegistration[]`). `PluginRegistry` class with conflict detection (different plugin claiming same `(point, id)` key returns typed `RegistryConflict`), idempotent self-update, scoped `unregisterPlugin`, point-filtered listing. `isApiCompatible(host, plugin)` checks major-version match. `EXTENSION_API_VERSION = '1.0'`.

New subpath export `@agentskit/os-core/plugins/catalog`.
