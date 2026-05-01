---
"@agentskit/os-core": minor
---

Add `ObservabilityConfig` and `SecurityConfig` schemas. Observability: trace exporters (console/langfuse/posthog/otlp/file), cost quotas, anomaly detection. Security: prompt firewall, PII redaction (9 categories), sandbox (e2b/webcontainer/docker, network scope), signed audit log (ed25519/hmac-sha256), `requireSignedPlugins`. New subpath exports `@agentskit/os-core/schema/observability` and `/schema/security`.
