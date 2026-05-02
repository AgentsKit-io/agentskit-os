---
"@agentskit/os-core": minor
---

Land RFC-0005 (Accepted): consent + break-glass primitives. Pure schema + decision logic.

`Sensitivity` enum (7 levels: public/internal/confidential/pii/financial/legal-privileged/phi) with `compareSensitivity()` ordering and `requiresConsent()` helper.

`ConsentRef` Zod schema (Ulid, subject hash, scope grammar `data:* | purpose:* | recipient:*`, ed25519 signed proof, jurisdiction tags, parent consent for amendments). `checkConsent(consent, requiredScope, now?)` returns `ConsentDecision` with codes `consent_missing | consent_expired | consent_scope_violation`.

`BreakGlassActivation` schema (canonical reasons + org-extended slug, principal initiator, bypasses array `hitl|consent|cost-budget|egress-allowlist|rate-limit`, scope with duration + resources, postHocReview discriminated union `mandatory|team-queue`, ttl, optional twoPersonRule). `evaluateBreakGlass(activation, { now?, allowedExtraReasons? })` returns `BreakGlassDecision` with rejection codes `two_person_required | ttl_expired | unknown_reason_disallowed | no_bypasses_declared`. Two-person rule auto-required for `safety-of-life`.

New subpath export `@agentskit/os-core/consent/consent`.
