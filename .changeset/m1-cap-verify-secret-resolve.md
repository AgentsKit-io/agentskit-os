---
"@agentskit/os-core": minor
---

Add pure runtime helpers:

- `auth/verify` — `verifyCapability(ctx, action, resource, now?)` returns `VerifyDecision = allow | deny`. Structural check only (no signature crypto — that lives in `os-security`). Implements wildcard suffix glob (`flow:*` matches `flow:pr-review:node:n1`) and expiry honoring `constraints.expiresAt`. Prefers a non-expired matching capability when multiple match.
- `secrets/refs` — pure `${vault:key}` reference utilities. `findVaultRefs(input)` returns deduped key list; `resolveVaultRefs(input, resolver)` substitutes references via async pluggable resolver, caches lookups, records `resolvedKeys` and `missingKeys` (missing refs left in place rather than throwing — caller decides policy).

New subpath exports `@agentskit/os-core/auth/verify` and `@agentskit/os-core/secrets/refs`.
