---
"@agentskit/os-core": minor
---

Add egress allowlist primitives per ADR-0011. `EgressPolicy` Zod schema (mode `deny | allow`, allowlist + blocklist of `EgressGrant` strings, per-plugin overrides, optional outbound proxy with vault-aware mTLS cert). `checkEgress(policy, requested, pluginId?)` returns `EgressDecision = allow | deny`. Default blocklist covers cloud-metadata endpoints (169.254.169.254, metadata.google.internal), localhost, and link-local addresses. Bare `net:fetch:*` rejected at parse — explicit `net:fetch:any` required for opt-in. `SecurityConfig.egress` wires it into the workspace config tree. New subpath export `@agentskit/os-core/security/egress`.
