# RFC-0005 — Patient Consent + Break-Glass Primitives (Healthcare-Grade)

- **Status:** Accepted
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

Healthcare deployments require: (a) cryptographic proof that any flow handling PHI ran under valid patient consent, and (b) a controlled override ("break-glass") for emergency clinical action that bypasses HITL gates with mandatory post-hoc review. Add `ConsentRef` and `BreakGlass` primitives to OS schema. Useful beyond healthcare: GDPR consent, finance trade authorization, sensitive data access in any regulated org.

## Motivation

- **Hospital is a target persona.** Without consent + break-glass, OS is HIPAA-non-compliant by design.
- **GDPR + LGPD.** Same patterns required (lawful basis + emergency exemption).
- **Audit trail truth.** ADR-0008 chain proves what ran; consent proves it was *allowed* to run; break-glass proves any exception was authorized.
- **Industry-agnostic.** Same primitives serve: finance trade approval, prison/legal access controls, child-safety review queues.

## Detailed Design

### 1. `ConsentRef`

```ts
ConsentRef {
  id: Ulid                           // unique consent grant
  subjectId: string                  // patient / data-subject id (hashed at rest)
  scope: ConsentScope[]              // ['data:medical_record', 'purpose:treatment']
  policy: ConsentPolicyRef           // see (3); ADR-0012 extension point
  grantedAt: ISO8601
  expiresAt?: ISO8601
  grantedBy: PrincipalRef            // user kind, signed
  proof: { algorithm: 'ed25519', publicKey, signature }
  revocableUntil?: ISO8601
  jurisdiction?: ('us-hipaa' | 'eu-gdpr' | 'br-lgpd' | string)[]
  parentConsent?: Ulid               // chain for amended consents
}
```

`ConsentScope` grammar:

```
data:<category>            // 'data:medical_record', 'data:billing'
purpose:<intent>           // 'purpose:treatment', 'purpose:research', 'purpose:marketing'
recipient:<principal-kind> // 'recipient:provider', 'recipient:third-party'
```

### 2. Consent enforcement

Engine checks: if any data flowing through node is tagged with sensitivity class requiring consent, the run **must** carry a `ConsentRef` matching scope. Missing → reject with `consent.missing` (ADR-0007). Mismatched scope → `consent.scope_violation`.

`Capability.constraints.consentRequired: ConsentScope[]` — adds consent as cap constraint (ADR-0006).

### 3. `ConsentPolicy` (extension point per ADR-0012)

```ts
ConsentPolicy {
  id: Slug
  jurisdiction: string
  validate(scope: ConsentScope[], data: ClassifiedData): ConsentValidation
  // built-in policies: hipaa-treatment, hipaa-research, gdpr-art6-consent, gdpr-art9-explicit
}
```

Plugins ship policies. Built-ins cover HIPAA/GDPR/LGPD basics.

### 4. Data classification

Every data field flowing through engine carries a `Sensitivity` tag (extends PII categories per RFC item from review #2):

```ts
Sensitivity = 'public' | 'internal' | 'confidential' | 'phi' | 'pii' | 'financial' | 'legal-privileged'
```

Tools/agents declare output sensitivity. Untagged → treat as most-sensitive (default-deny analog).

### 5. `BreakGlass` flow node

```ts
BreakGlassNode {
  kind: 'break-glass'
  id: NodeId
  reason: 'emergency-clinical' | 'safety-of-life' | 'court-order' | string
  initiator: PrincipalRef            // user kind required
  bypasses: ('hitl' | 'consent' | 'cost-budget' | 'egress-allowlist' | 'rate-limit')[]
  scope: { duration: { ms: number }, resources: ResourceRef[] }
  postHocReview:
    | { mode: 'mandatory', reviewer: PrincipalRef, slaHours: number }
    | { mode: 'team-queue', queue: string, slaHours: number }
  ttl: ISO8601                       // hard expiry; engine refuses after
  twoPersonRule?: { secondInitiator: PrincipalRef }
}
```

Activation requires:

1. Authenticated principal with `break-glass:activate` capability.
2. `reason` from approved list (or org-extended).
3. Optional second-person sign-off (configurable, default: required for `safety-of-life`).
4. Emit `system.audit.break_glass.activated` event with full context (ADR-0008 chain anchors).

After TTL, breakglass token unusable; engine reverts to standard policy.

### 6. Mandatory post-hoc review

A break-glass activation creates a **review item** in workspace queue. Reviewer must complete within SLA. Overdue → escalation event + workspace flag.

```yaml
security:
  breakGlass:
    enabledReasons: [emergency-clinical, safety-of-life]
    twoPersonRequired: [safety-of-life]
    reviewSlaHours: 24
    escalationChain: [chief-medical-officer, compliance-officer]
```

### 7. UI

Desktop "Break Glass" button is conspicuous, requires confirmation modal with reason + duration selector. Activation banner persists across all UIs until expiry. Trace viewer marks every event under break-glass with red badge.

### 8. Consent revocation

Patient revokes consent → `consent.revoked` event. Engine searches active runs touching subject → soft-cancels (configurable: hard-stop vs finish-current-step). Past runs preserved in audit; future runs blocked.

### 9. Right-to-erasure (GDPR)

Erasure request → `consent.erasure_requested`. Workspace runs purge job: delete subject content from memory stores, replace with tombstone hash (preserves audit chain integrity per ADR-0008 §6).

### 10. Schema location

```
packages/os-core/src/consent/
  consent.ts          # ConsentRef, ConsentScope, ConsentPolicyRef
  classification.ts   # Sensitivity enum + extensible categories
  break-glass.ts      # BreakGlassNode + activation contract
```

Wires into `RunContext`, capability constraints, flow node union.

## Alternatives Considered

- **Externalize entirely (consent SaaS).** Rejected. Healthcare requires self-host. Schema stays in core, integrations are plugins.
- **Scope-string only, no policy plugin.** Rejected. Jurisdictions differ; need extensibility.
- **Skip break-glass; rely on disabling HITL.** Rejected. Loses the audit trail and 2-person rule.
- **Consent as plain workspace doc.** Rejected. Need cryptographic proof + machine enforcement.

## Drawbacks

- Significant schema surface.
- Misuse risk: break-glass abused for convenience. Mitigations: prominent UI, per-reason quotas, monthly compliance dashboard.
- False sense of security: consent + break-glass do not by themselves make a system HIPAA-compliant — many other controls needed. Doc must be clear.

## Migration Path

- Pre-M1 → ship in M1 alongside vault + capability schemas (the consent ref reuses the same crypto + cap plumbing).
- Healthcare verticalization templates (`templates/healthcare-*`) unlocked once landed.

## Security & Privacy Impact

- **Net positive.** Cryptographic consent + auditable override is industry minimum.
- **Threat:** consent forgery — mitigated by signing key custody (ADR-0008 modes).
- **Threat:** break-glass token replay — mitigated by TTL + nonce + single-use option.
- **Threat:** tombstone vs hash chain conflict — addressed in ADR-0008 §6.
- **Privacy:** subject IDs hashed at rest; raw subject identifiers only in vault.

## Open Questions

- [ ] Hashing scheme for subject IDs — HMAC with workspace key vs salted SHA — performance vs correlation safety.
- [ ] Multi-jurisdiction consents (patient in EU, provider in US) — which policy wins?
- [ ] Pediatric / guardian consent chain — `parentConsent` for patient-of-minor case.
- [ ] Integration with EHR consent stores (Epic, Cerner) — adapter shape.
- [ ] Break-glass + replay (ADR-0009): can a `replay` run inherit historical break-glass authorization, or always rejected?
