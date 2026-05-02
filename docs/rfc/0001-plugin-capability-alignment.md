# RFC-0001 — Align `PluginConfig.capabilities` with ADR-0006 Capability Model

- **Status:** Accepted
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

Today `PluginConfig.capabilities` is a flat enum (`tool | trigger | skill | memory | ui-panel | ui-widget | observability`) describing what the plugin **provides**. ADR-0006 introduces a capability-based RBAC where `Capability` describes what a principal **may do** (resource + actions + constraints). Two concepts, same word, same field. Collision will harden if shipped this way. Rename + split before M1 freeze.

## Motivation

- **Semantic collision.** Reviewers + plugin authors cannot tell whether `capabilities: ['tool']` means "exposes a tool" or "permitted to invoke tools".
- **Permission model gap.** Marketplace install (M5) needs a manifest of **requested permissions** to render a grant prompt. Current schema cannot express it.
- **Audit/RBAC alignment.** ADR-0006 capabilities flow through events (ADR-0005) and audit logs (ADR-0007). Plugins must speak the same vocabulary.
- **Window closing.** Pre-M1, no public consumers. Renaming after M1 = SemVer major + RFC-gated breaking change for every downstream.

## Detailed Design

### 1. Rename existing field

`PluginConfig.capabilities` → `PluginConfig.contributes`. Same enum, clearer name.

```ts
PluginContribution = 'tool' | 'trigger' | 'skill' | 'memory' | 'ui-panel' | 'ui-widget' | 'observability'

PluginConfig {
  ...
  contributes: PluginContribution[]    // was: capabilities
  permissions: PluginPermission[]      // new
}
```

### 2. New `permissions` field — requested grants

Plugins declare **requested** capabilities at install time. User reviews + approves. Engine issues signed `Capability` records (ADR-0006) bound to the plugin principal.

```ts
PluginPermission = {
  resource: ResourceRef           // 'vault:openai_key', 'net:fetch:api.github.com', 'flow:*'
  actions: Action[]               // ['read'], ['invoke']
  reason: string                  // 1–280 chars, shown in grant UI
  constraints?: CapabilityConstraints   // optional rate/budget/expiry cap requested
  required: boolean               // false = nice-to-have, install proceeds if denied
}
```

Manifest-level only — not the issued capability. Engine combines manifest + user approval → real `Capability` (signed, with `issuer = workspace`).

### 3. Type names

| Old | New |
|---|---|
| `PluginCapability` | `PluginContribution` |
| (none) | `PluginPermission` |

`Capability` (ADR-0006) stays as runtime auth object.

### 4. Validation rules

- Reserved resource domains (ADR-0005 §2 + ADR-0006 §2) enforced.
- `permissions[].resource` matching `vault:*` requires `required: false` unless `signature` field present (signed plugins only get auto-grant prompt for vault).
- Manifest-declared `permissions` MUST be subset of capabilities the plugin actually requests at runtime — runtime enforces; over-request → `plugin.permission_undeclared` error (ADR-0007).

### 5. Examples

```yaml
plugins:
  - id: github-pr-bot
    name: GitHub PR Bot
    version: 1.0.0
    source: marketplace:github-pr-bot
    contributes: [tool, trigger]
    permissions:
      - resource: net:fetch:api.github.com
        actions: [invoke]
        reason: Fetch and comment on PRs
        required: true
      - resource: vault:github_token
        actions: [read]
        reason: Authenticate to GitHub API
        required: true
      - resource: flow:*
        actions: [trigger]
        reason: Allow webhook to start flows
        constraints:
          rateLimit: { perMin: 60 }
        required: false
```

## Alternatives Considered

- **Keep `capabilities` as-is, add `permissions` separately.** Rejected. Word collision survives; future readers conflate.
- **Drop `contributes` entirely; infer from manifest entry points.** Rejected. Loses static validation, harder marketplace filtering.
- **Use OAuth scope strings.** Rejected. Already chose object-cap in ADR-0006; mixing models worsens DX.
- **Defer to M5 (marketplace milestone).** Rejected. Forces SemVer major + downstream break.

## Drawbacks

- Renames already-shipped Zod export `PluginCapability`. Minor churn — pre-M1, no external consumers.
- Two adjacent fields (`contributes` vs `permissions`) require doc clarity. Mitigated by examples + grant UI screenshots.

## Migration Path

Pre-M1 — no external consumers. Single PR:

1. Rename `PluginCapability` → `PluginContribution` in `schema/plugin.ts`.
2. Rename field `capabilities` → `contributes`.
3. Add `permissions: PluginPermission[]` (default `[]`).
4. Add `PluginPermission` schema importing `ResourceRef`, `Action`, `CapabilityConstraints` from `auth/capability.ts`.
5. Update tests + EPICS doc.
6. Changeset: `breaking` (still `0.x` → no major bump required).

For any internal early adopter using `capabilities` field, add one-release deprecation: accept both, warn on `capabilities`, drop next minor.

## Security & Privacy Impact

- **Net positive.** Explicit permission manifest closes the gap where plugins could silently expand scope at runtime.
- **Threat:** plugin requests broad `flow:*` invoke. Mitigation: grant UI shows wildcard explicitly; signed-plugin policy can require exact resources.
- **Audit:** every grant + revocation emits `system.audit.cap.*` (ADR-0006 §8).
- **Vault refs:** `vault:*` permission requests get distinct grant UI + biometric confirm (M6).

## Open Questions

- [ ] Should `permissions` allow templated resources (`vault:${input.keyName}`)? Probably no for v1 — invites injection.
- [ ] Plugin update flow: new version requests new permission. Re-prompt? Block until granted? Default proposal: block, surface diff.
- [ ] Marketplace metadata: index plugins by `permissions[].resource` for "find low-permission alternatives" search.
- [ ] Wildcard semantics: does `flow:*` match `flow:billing:node:n1`? Yes — wildcard is suffix glob. Document explicitly.
