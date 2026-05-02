# ADR-0012 — Plugin Extension Point Catalog

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Plugin system (M5, I-3) needs an enumerated list of stable extension points. Without it, every plugin author guesses what they can extend, in-tree code uses internal APIs plugins can't reach, and core/plugin parity drifts. Drift = "you can do X in core but not from a plugin" frustration that kills ecosystems.

## Decision

### 1. Catalog of extension points (v1)

Each entry = stable Zod contract + lifecycle hooks + ADR/RFC for any change.

| Extension point | Interface | Examples |
|---|---|---|
| `trigger` | `TriggerHandler` | cron, webhook, custom-cdc |
| `tool` | `Tool` (with `sideEffects`, `sandbox`) | http-fetch, git-clone, postgres-query |
| `skill` | `Skill` | summarize, classify, route |
| `agent-template` | `AgentBlueprint` | researcher, coder, reviewer |
| `flow-node-kind` | `NodeKind` | compare, vote, debate, auction (RFC-0003) |
| `memory-backend` | `MemoryStore` | sqlite, redis, qdrant, custom |
| `vault-backend` | `VaultBackend` | os-keychain, hashicorp-vault, aws-kms |
| `sandbox-runtime` | `SandboxRuntime` (ADR-0010) | docker, firecracker, webcontainer |
| `egress-enforcer` | `EgressEnforcer` (ADR-0011) | iptables, seccomp, app-level |
| `obs-exporter` | `TraceExporter` | langfuse, posthog, datadog, otlp |
| `firewall-rule` | `FirewallRule` (O-2) | prompt-injection-detector, custom-regex |
| `output-guard` | `OutputGuard` | secret-leak-scan, brand-kit-check (RFC-0004) |
| `pii-category` | `PiiCategoryDef` | medical-record-number, customer-id |
| `run-mode` | `RunModeProvider` (ADR-0009) | rare; e.g. eval-harness mode |
| `audit-signer` | `AuditSigner` (ADR-0008) | hsm, sigstore, custom-kms |
| `cost-meter` | `CostMeter` | provider-specific pricing |
| `ui-panel` | `DesktopPanel` (M2) | dashboard widget |
| `ui-widget` | `Widget` (U-6/U-8) | chart, viewer |
| `command-palette-action` | `PaletteAction` | custom commands |
| `mcp-bridge-adapter` | `McpAdapter` (I-4) | custom MCP servers |
| `migration-importer` | `Importer` (C-5) | langflow, n8n, dify |
| `template-pack` | `TemplatePack` (P-6) | private team gallery |
| `consent-policy` | `ConsentPolicy` (RFC-0005) | hipaa, gdpr |
| `brand-kit-validator` | `BrandKitValidator` (RFC-0004) | tone, banned phrases |

### 2. Stability tiers

| Tier | Guarantee | Change rule |
|---|---|---|
| `stable` | SemVer-major frozen | RFC + major bump |
| `experimental` | flagged, may change minor-to-minor | RFC for promote-to-stable |
| `internal` | not in catalog, plugin authors warned off | none |

v1 = all stable except `flow-node-kind`, `consent-policy`, `brand-kit-validator`, `cost-meter` start `experimental`.

### 3. In-tree parity rule

Every built-in feature consumes the **same** extension-point interface as plugins would. No internal-only API for first-party features. Lint check: `import { internal/* }` from non-test code → fail.

### 4. Discovery + registration

```ts
PluginEntrypoint {
  id: Slug
  exports: {
    triggers?: TriggerHandler[]
    tools?: Tool[]
    nodes?: NodeKind[]
    // ... per catalog
  }
  activate?(ctx: ActivationContext): Promise<void>
  deactivate?(): Promise<void>
}
```

Registered at workspace boot. Hot-reload supported for: tools, skills, prompts, templates, ui-panels. Not supported (require restart): sandbox-runtime, egress-enforcer, audit-signer, vault-backend.

### 5. Capability requirement table

Each extension point declares which capabilities (ADR-0006) the host grants by default and which require explicit user prompt:

| Extension | Default grants | Prompt-required |
|---|---|---|
| `tool` | none | per side-effects (ADR-0010) |
| `vault-backend` | `vault:*:read` (own keys only) | cross-plugin vault access |
| `audit-signer` | `audit:write` | key-export |
| `trigger` | `event:emit:plugin.<id>.*` | cross-workspace dispatch |
| ... | | |

Full table in `docs/PLUGIN-CAPABILITIES.md` (codegen from this ADR).

### 6. Versioning

Catalog versioned. Plugin manifest declares `extensionApi: '1.x'`. Host rejects mismatched majors with `plugin.api_incompatible` (ADR-0007).

### 7. Catalog is a contract test fixture

`@agentskit/os-contracts-test` (planned) ships golden fixtures per extension point. Plugin authors run suite → green = compatible.

## Consequences

- Plugin authors have one place to learn surface.
- Reviewers reject plugins that bypass catalog.
- In-tree code gets dogfooding for free.
- Catalog growth governed — every addition = ADR appendix or new ADR.
- Adds maintenance burden of a catalog file — accepted; it is the contract.

## Alternatives Considered

- **No catalog, ad-hoc plugin APIs.** Rejected. Drift.
- **Single mega-interface.** Rejected. Forces plugins to import unrelated surface.
- **Roll into PluginConfig schema.** Rejected. Schema = manifest; this is runtime contract.

## Open Questions

- Cross-plugin extension (plugin extends another plugin's extension point)?
- How to deprecate an extension point — grace period semantics.
- Telemetry: track which extension points actually used → prune dead surface.
