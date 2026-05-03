---
"@agentskit/os-core": minor
---

M1 polish: BrandKit OutputGuard, patient consent, air-gap enforcement, adapter fallback chain.

Four issues shipped together to minimise schema conflict surface:

**#195 — BrandKit + OutputGuard (RFC-0004)**
`validateAgainstBrandKit` and `hasBlockingViolation` provide pure content-guard logic covering banned phrases (case-insensitive), required disclaimers, length limits, and capitalization rules. Multi-client override resolution via `BrandKit.client` slug. Full test coverage in `tests/brand/`.

**#186 — Patient consent + break-glass (RFC-0005)**
`checkConsent` enforces scope matching and TTL on `ConsentRef`. `evaluateBreakGlass` enforces two-person rule, TTL, and approved-reason list on `BreakGlassActivation`. Pure helpers — no I/O. Full test coverage in `tests/consent/`.

**#184 — Air-gap mode enforcement**
`airGapEnforce(policy, request)` decides whether telemetry, marketplace, cloudSync, externalLlm, or egress requests are permitted. When `policy.airGapped`, external LLMs are denied unless the provider is in `policy.localProviders`; egress is restricted to loopback (`localhost`, `127.0.0.1`, `::1`). Error code: `os.security.airgap_blocked`. Full test coverage in `tests/security/`.

**#194 — Adapter fallback chain**
`pickAdapter({ primary, fallbacks, available, preferLocal })` selects the first reachable provider. With `preferLocal: true`, local providers (tagged `local: true` on `FallbackEntry`) are preferred over network providers. Throws `NoAdapterAvailableError` (code `os.runtime.no_adapter_available`) when no provider is reachable. `AgentModelConfig.fallbackChain` field added. Full test coverage in `tests/runtime/`.
