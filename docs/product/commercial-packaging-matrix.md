# Commercial packaging matrix — OSS · Pro · Team · Enterprise

**Status:** living document
**Scope:** how AgentsKitOS is packaged across self-hosted OSS, hosted Cloud (Pro / Team), and Enterprise. Defines what stays MIT-core versus what is a paid hosted service or commercial add-on.
**Related issues:** [#122](https://github.com/AgentsKit-io/agentskit-os/issues/122)–[#131](https://github.com/AgentsKit-io/agentskit-os/issues/131), [#342](https://github.com/AgentsKit-io/agentskit-os/issues/342), [#373](https://github.com/AgentsKit-io/agentskit-os/issues/373).

> This is product packaging guidance, not a contract. Pricing assumptions are directional and intended to align engineering, marketplace, and cloud billing roadmaps.

---

## 1. Tier overview

| Tier | Audience | Deployment | License | Commercial model |
|---|---|---|---|---|
| **OSS** | Individual builders, OSS contributors, students | Self-host (CLI + local desktop) | MIT | Free, community-supported |
| **Pro** | Solo founders, indie devs, power users | AgentsKitOS Cloud (single-seat) | MIT core + hosted SaaS | Flat monthly + usage-based credits |
| **Team** | 2–25 person teams, agencies, small SaaS | AgentsKitOS Cloud (multi-seat) | MIT core + hosted SaaS | Per-seat + shared credit pool |
| **Enterprise** | Regulated, large orgs, gov-adjacent | Self-host (air-gapped) **or** dedicated Cloud | MIT core + Enterprise EULA add-ons | Annual contract + support |

Marketplace runs on top of all tiers with a unified take-rate (see §5).

---

## 2. Capability matrix (engineering perspective)

Legend: ✅ included · 🟡 limited / capped · ❌ not in tier

| Capability | OSS | Pro | Team | Enterprise |
|---|---|---|---|---|
| Core runtime, flows, agents, plugins | ✅ | ✅ | ✅ | ✅ |
| Coding-agent providers (Codex, Claude Code, Cursor, Gemini, Aider, OpenCode, Continue) | ✅ | ✅ | ✅ | ✅ |
| Local desktop UI | ✅ | ✅ | ✅ | ✅ |
| Local trace viewer (Langfuse / PostHog OOTB) | ✅ | ✅ | ✅ | ✅ |
| Workspace policy-as-code engine | ✅ | ✅ | ✅ | ✅ |
| Sandbox plugins (container / vm / webcontainer) | ✅ | ✅ | ✅ | ✅ |
| Cloud-hosted workspace sync | ❌ | ✅ | ✅ | ✅ |
| Free monthly cloud credits | ❌ | 🟡 (small bundle) | 🟡 (per-seat bundle) | ✅ (committed pool) |
| Usage-based credit top-up | ❌ | ✅ | ✅ | ✅ (committed) |
| Team seats + RBAC | ❌ | 🟡 (1 seat) | ✅ | ✅ (with SCIM) |
| SSO (Google / GitHub) | ❌ | ✅ | ✅ | ✅ |
| Enterprise SSO (SAML / OIDC, SCIM) | ❌ | ❌ | 🟡 (add-on) | ✅ |
| Dedicated tenant / VPC / air-gapped install | ❌ | ❌ | ❌ | ✅ |
| Audit log retention | 🟡 (local-only) | 🟡 (30 days) | 🟡 (90 days) | ✅ (configurable, ≥1 year) |
| Compliance export wizard (SOC2 / HIPAA / GDPR) | 🟡 (local format) | 🟡 (basic) | ✅ | ✅ (signed, retained) |
| Cost guards & workspace quotas | ✅ | ✅ | ✅ | ✅ |
| Cost heat map · anomaly detection | 🟡 (local) | ✅ | ✅ | ✅ |
| Marketplace install (free + community plugins) | ✅ | ✅ | ✅ | ✅ |
| Marketplace install (paid plugins) | ❌ (license redirect) | ✅ | ✅ | ✅ (private mirror allowed) |
| Marketplace publishing | ✅ (free / community) | ✅ | ✅ | ✅ |
| Plugin provenance, SBOM, permission diff | ✅ | ✅ | ✅ | ✅ |
| Private team template library | ❌ | ❌ | ✅ | ✅ |
| Plugin certification badge | ❌ (community badge) | ❌ | 🟡 (self-attest) | ✅ (verified) |
| Auto-update + rollback | ✅ | ✅ | ✅ | ✅ (channel-pinned) |
| Backup & restore — encrypted full-workspace export | ✅ (local) | ✅ | ✅ | ✅ (managed retention) |
| Support | Community / GitHub Issues | Email · best-effort | Priority email + chat | 24 / 7 with SLA |
| Roadmap influence | Public | Public | Quarterly call | Customer council |

---

## 3. Pricing assumptions

These are starting assumptions; finance owns final numbers.

### Pro
- Flat **$20 / user / month**.
- Includes a small monthly bundle of cloud credits (e.g. ~$5 worth at cost) and a soft cap on concurrent agent runs.
- Overage billed by usage-based credits (see §4).

### Team
- **$40 / seat / month**, billed annually preferred.
- Shared workspace credit pool sized per seat count.
- Adds RBAC, longer audit retention, and the private team template library.

### Enterprise
- Annual contract starting at **$50 k / year** for the platform license, plus committed cloud credits or a hosting fee for dedicated tenants.
- Optional **on-prem / air-gapped** install adds installation, support, and update-channel fees.
- Includes a customer success quota: onboarding, threat-model review, compliance evidence, named support.

> Educational, OSS, and approved community programs receive discounted or free Team-equivalent access on a case-by-case basis.

---

## 4. Cloud credits

- Credits cover **provider tokens, workspace storage, replay storage, and compute** for hosted runs.
- Credits are **usage-priced at cost + margin** (margin in the 15–25 % band) and metered per resource. Token costs pass through provider list price plus margin.
- **Top-up** flow lets Pro / Team self-serve. Enterprise commits in the contract.
- Free OSS users do not consume credits — they pay only their own provider keys when self-hosting.

Failure modes (timeouts, hallucinated diffs) may be partially refundable per a published policy; this aligns with the failure taxonomy work in [#376](https://github.com/AgentsKit-io/agentskit-os/issues/376).

---

## 5. Marketplace economics

- **Free / community plugins** — no take-rate, available in every tier. Provenance, SBOM, and permission diff still required.
- **Paid plugins** — single rev-share rate of **20 %** (publisher keeps 80 %). Same rate for Pro / Team / Enterprise to keep ledger logic simple.
- **Sponsored slots** — transparent, labeled ad inventory ([#129](https://github.com/AgentsKit-io/agentskit-os/issues/129)) with a separate sponsorship contract; never bundled into rev-share.
- **Marketplace subscription** — the optional plugin-bundle subscription ([#127](https://github.com/AgentsKit-io/agentskit-os/issues/127)) is sold from the same biller as the workspace tier.
- **Enterprise mirror** — Enterprise customers may run a **private mirror** of marketplace, gated by SBOM / signature requirements; rev-share still applies on paid plugins consumed.

---

## 6. Self-host vs. hosted boundary

What stays **MIT / core** (always free to self-host):

- Runtime, flows, agents, plugins, and SDKs.
- All coding-agent providers and the conformance suite.
- Workspace policy-as-code, sandbox primitives, and audit-log writers.
- Dev-orchestrator, benchmarking, trace and diff collectors.
- Local desktop app and trace viewer.
- Marketplace SDK, publisher tooling, plugin provenance / SBOM checks.

What is **commercial / cloud-only** (paid services):

- Hosted workspace sync, multi-seat collaboration, cross-device state.
- Managed credit billing, top-up, and usage metering at provider-cost-plus pricing.
- Hosted enterprise SSO, SCIM, dedicated tenants, and air-gapped installer / update channels.
- Long-retention audit log storage, signed compliance exports, and managed backup.
- 24/7 support, customer-success engagements, and roadmap-influence privileges.
- Certification of marketplace plugins (the *verified* badge) — community badges remain free.

This split is intentional: every safety-relevant primitive ships in OSS so self-hosters never lose security/observability features by avoiding the commercial offering.

---

## 7. Cross-issue alignment

| Surface | Drives | Issues |
|---|---|---|
| Hosted workspace sync | Cloud baseline | [#122](https://github.com/AgentsKit-io/agentskit-os/issues/122) |
| Free + Pro plan | Pro tier | [#123](https://github.com/AgentsKit-io/agentskit-os/issues/123) |
| Enterprise self-host + SSO + air-gapped | Enterprise tier | [#124](https://github.com/AgentsKit-io/agentskit-os/issues/124) |
| Auto-update + rollback | All tiers | [#125](https://github.com/AgentsKit-io/agentskit-os/issues/125) |
| Marketplace subscription | Optional add-on | [#127](https://github.com/AgentsKit-io/agentskit-os/issues/127) |
| Team seats + RBAC | Team tier | [#128](https://github.com/AgentsKit-io/agentskit-os/issues/128) |
| Sponsored tools + revenue share | Marketplace | [#129](https://github.com/AgentsKit-io/agentskit-os/issues/129) |
| Cloud credits + top-up | Pro / Team / Enterprise | [#130](https://github.com/AgentsKit-io/agentskit-os/issues/130) |
| Enterprise billing portal | Enterprise tier | [#131](https://github.com/AgentsKit-io/agentskit-os/issues/131) |
| Plugin provenance, SBOM, permission diff | Marketplace integrity | [#342](https://github.com/AgentsKit-io/agentskit-os/issues/342) |
| Enterprise admin console | Enterprise tier | [#373](https://github.com/AgentsKit-io/agentskit-os/issues/373) |

Updates to this matrix should land alongside changes to those issues so packaging stays consistent with what's being shipped.
