# RFC-0004 — BrandKit + Content Guardrails Primitive

- **Status:** Draft
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

Marketing agencies (and any client-facing org) have brand-voice rules — tone, banned phrases, required disclaimers, approved terminology. Today users would jam these into prompts ad-hoc. Add a `BrandKit` primitive + `OutputGuard` (ADR-0012) so brand rules are declared once and enforced on every LLM output across all agents/flows in the workspace or per client.

## Motivation

- **Marketing agency = primary OS persona** (alongside hospital and dev). Without brand controls, OS fails the use case.
- **Multi-client isolation.** Same agency, different clients, different rules. Workspace-level + tag-level overrides.
- **Compliance.** Regulated industries (finance, pharma) require disclaimers. Hard-coding into prompts ≠ enforcement.
- **Reusability.** A brand kit is a shareable artifact (marketplace, team templates).

## Detailed Design

### 1. `BrandKit` schema

```ts
BrandKit {
  id: Slug
  name: string
  version: SemVer
  client?: Slug                       // optional client tag for agency multi-tenant
  voice: {
    tone: ('formal' | 'casual' | 'playful' | 'technical' | 'empathetic')[]
    persona?: string                  // 'expert friend', 'fintech analyst'
    examples?: { good: string[], bad: string[] }
  }
  vocabulary: {
    preferredTerms: { term: string, useInstead: string }[]
    bannedPhrases: { phrase: string, reason: string, severity: 'warn' | 'block' }[]
    requiredDisclaimers?: { text: string, where: 'first' | 'last' | 'inline', triggerOn: string[] }[]
    glossary?: { term: string, definition: string }[]
  }
  formatting: {
    titleCase?: boolean
    oxfordComma?: boolean
    quoteStyle?: 'curly' | 'straight'
    emoji?: 'always' | 'sometimes' | 'never'
    lengthLimits?: { min?: number, max?: number, perChannel?: Record<string, { min?: number, max?: number }> }
  }
  identity: {
    productName?: string
    legalName?: string
    capitalizationRules?: Record<string, string>      // 'Apple' not 'apple'
    pronouns?: 'we' | 'i' | 'they'
  }
  validators?: BrandKitValidatorRef[]                  // plugin-extensible (ADR-0012)
  metadata: { tags: TagList, docs?: URL }
}
```

### 2. Application

Three layers, in order:

1. **Prompt augmentation** — kit injects system-prompt addendum (voice + persona + glossary).
2. **Generation guidance** — adapter passes kit hints (e.g. logit bias on banned phrases when supported).
3. **Output guard** (post-hoc) — `BrandKitValidator` runs against every assistant message:
   - Banned phrase → block (severity `block`) or annotate (severity `warn`).
   - Missing required disclaimer → auto-append or fail.
   - Length violation → reject + retry with constraint.
   - Preferred-term substitution → soft-rewrite suggestion in trace.

### 3. Workspace wiring

```yaml
security:
  outputGuards:
    brandKit: marketing-acme@^1.0
agents:
  - id: copywriter
    brandKit:
      ref: marketing-acme@^1.0
      override:
        voice: { tone: [casual] }     # node-level tweak
flows:
  - id: client-x-blog
    nodes:
      - id: write
        kind: agent
        agentRef: copywriter
        brandKit: client-x-brand@^1.0  # client-tag overrides agent default
```

Resolution order: node > agent > flow > workspace > workspace default.

### 4. Cost-per-client reporting

`BrandKit.client` slug surfaces in `Principal.tags` for cost heat map (O-7) — agencies see cost-by-client without manual tagging.

### 5. Approval workflow integration

Built-in HITL pattern (RFC-0003 + native approval):

```
draft -> brand-validate -> account-manager-review -> client-approval -> publish
```

Ships as template `agency/client-content-approval`.

### 6. Marketplace

`BrandKit` is a marketplace artifact. Agencies sell their style guides. Clients import. Plugin permission model (RFC-0001) covers vault + egress access; brand kits are content-only, no permissions needed.

### 7. Versioning + audit

Every brand-kit change emits `system.audit.brand_kit.updated`. Time-travel can replay an old generation against the kit version that was active.

### 8. Schema location

```
packages/os-core/src/schema/brand-kit.ts
```

Adds `BrandKitRef` to agent + flow + node schemas.

## Alternatives Considered

- **Just put rules in prompts.** Rejected. No enforcement; drifts; un-auditable.
- **Plugin-only feature.** Rejected. Marketing is a primary persona; in-tree parity (ADR-0012).
- **Couple to Notion / Figma.** Rejected. Lock-in. Plugins can sync from those.
- **One global validator instead of pluggable.** Rejected. Industries differ (pharma fair-balance, finance disclaimers).

## Drawbacks

- Yet another schema.
- Output guard latency — mitigated: validators must be fast (<50ms) or async.
- Banned-phrase regex maintenance burden on agency.

## Migration Path

- New primitive; no migration.
- Ship 3 starter kits (generic SaaS, B2B technical, finance regulated) in templates.

## Security & Privacy Impact

- **Reduced risk** of off-brand output reaching client.
- **Threat:** banned-phrase list could be inverted to learn what's sensitive (insider threat). Mitigation: kits stored in vault for sensitive cases.
- **Audit:** every block/warn = event for compliance review.

## Open Questions

- [ ] Multi-language support — separate kit per locale or fields per locale?
- [ ] Auto-learn brand voice from approved content (ML feature, post-GA).
- [ ] Live-preview brand violation in flow editor — performance constraints.
- [ ] Conflict resolution when overlapping kits applied (workspace + client).
