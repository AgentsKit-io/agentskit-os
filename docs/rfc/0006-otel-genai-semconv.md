# RFC-0006 — Adopt OpenTelemetry `gen_ai.*` Semantic Conventions

- **Status:** Draft
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

OpenTelemetry has finalized `gen_ai.*` semantic conventions for GenAI spans (request, response, tokens, tools, agent steps). Every observability vendor (Datadog, Honeycomb, Langfuse, Grafana, NewRelic, AWS X-Ray) maps from this. Adopt directly in OS observability schema → free interop, no vendor adapters needed.

## Motivation

- **Free integration.** Every team uses **some** observability stack. If we emit standard spans, all of them work day-1. If we invent ours, every customer needs adapter.
- **Comparable industry data.** Span shape stable across providers — analytics + AIOps work.
- **Reduces our maintenance.** One spec to track, not N vendor SDKs.
- **Aligns with ADR-0005** event envelope (CloudEvents) — same "use the standard" posture.

## Detailed Design

### 1. Required attributes per span kind

#### LLM request span (`gen_ai.client.inference`)

```
gen_ai.system               # 'anthropic' | 'openai' | 'google.gemini' | ...
gen_ai.request.model        # 'claude-sonnet-4-6'
gen_ai.request.max_tokens
gen_ai.request.temperature
gen_ai.request.top_p
gen_ai.request.top_k
gen_ai.request.stop_sequences
gen_ai.request.frequency_penalty
gen_ai.request.presence_penalty
gen_ai.request.seed                    # for determinism mode (ADR-0009)
gen_ai.response.id
gen_ai.response.model                  # provider-resolved snapshot id (RFC-0002 pin)
gen_ai.response.finish_reasons
gen_ai.usage.input_tokens
gen_ai.usage.output_tokens
gen_ai.usage.cache_read_tokens
gen_ai.usage.cache_creation_tokens
```

Plus OS extensions (namespaced under `agentskitos.*`):

```
agentskitos.workspace.id
agentskitos.principal.id
agentskitos.principal.kind
agentskitos.run.id
agentskitos.run.mode                   # ADR-0009
agentskitos.cost.usd
agentskitos.cost.estimated_usd
agentskitos.cost.budget_remaining_usd
agentskitos.consent.id                 # RFC-0005, when applicable
agentskitos.brand_kit.id               # RFC-0004, when applicable
```

#### Tool call span (`gen_ai.execute_tool`)

```
gen_ai.tool.name
gen_ai.tool.call.id
gen_ai.tool.type
gen_ai.tool.description
agentskitos.tool.side_effects          # ADR-0010
agentskitos.tool.sandbox_level
agentskitos.tool.allowed_egress        # ADR-0011
```

#### Agent step span (`gen_ai.invoke_agent`)

```
gen_ai.agent.id
gen_ai.agent.name
gen_ai.operation.name                  # 'chat', 'plan', 'review', ...
agentskitos.agent.parent_id
agentskitos.flow.node.kind             # 'agent' | 'compare' | 'vote' | 'debate' | 'auction' | 'blackboard' (RFC-0003)
```

### 2. Span events

```
gen_ai.system.message
gen_ai.user.message
gen_ai.assistant.message
gen_ai.tool.message
gen_ai.choice
```

Bodies redacted per workspace `trace.redact` config (see review item) before persistence.

### 3. Exporter contract

`obs-exporter` extension point (ADR-0012) accepts standard OTLP. Built-in exporters: console, file, OTLP/HTTP, OTLP/gRPC. Plugin exporters: Langfuse, PostHog, Datadog, Honeycomb (each = thin OTLP forwarder).

### 4. Trace context propagation

W3C `traceparent` + `tracestate` headers on every outbound HTTP from agent. Tools auto-inject. ADR-0005 events already carry `traceId` + `spanId` — same IDs.

### 5. Sampling

`obs.sampling.rule` config: head-based (per workspace), tail-based (full trace if error/cost spike), per-flow override. Defaults: 100% errors, 100% cost-spike, 10% normal.

### 6. Sensitive content handling

Prompt + response bodies are large + sensitive. Three modes:

| Mode | Bodies | Use |
|---|---|---|
| `metadata-only` | dropped, only token counts + metadata | regulated, default for HIPAA |
| `redacted` | PII-redaction filter applied | default for prod |
| `full` | raw | dev / debug only |

Configured at workspace level + per-flow override.

### 7. Cost computation

Uniform: `tokens × $/token` from versioned price table (cost-meter extension, ADR-0012). Tokens = OTel-standard fields. Cost = OS-extension. Re-computable post-hoc when prices change (audit-friendly).

### 8. Schema location

```
packages/os-core/src/observability/
  semconv.ts          # constants for every attribute name
  span-kinds.ts       # SpanKind enum + factories
  exporter.ts         # TraceExporter interface (extends ADR-0012)
  redaction.ts        # body redaction pipeline
```

Existing `ObservabilityConfig` schema extended with `semconv: 'otel-gen-ai-v1'` field (literal for now; future versions = enum).

## Alternatives Considered

- **Custom OS span schema.** Rejected. Re-invents OTel; loses every vendor day 1.
- **Langfuse-native only.** Rejected. Vendor lock contradicts ADR-0001 #6.
- **Drop OS extensions; OTel-only.** Rejected. Need workspace/principal/cost/consent dims.
- **Wait for OTel `gen_ai` to be `Stable`.** Rejected — currently `Experimental` but maturing rapidly; pin a version, migrate on release. Cost of waiting > cost of one migration.

## Drawbacks

- OTel `gen_ai` is Experimental. Risk of breaking changes — mitigated by pinning version + migration helper.
- Attribute names are long (`gen_ai.request.max_tokens`). Acceptable; tooling handles it.
- Some niche fields not in spec (e.g. `cache_creation_tokens`) — OS-extension covers gap.

## Migration Path

- New observability code; no migration. Trace viewer (M2) reads standard attrs from start.
- Plugins emitting custom span shapes: deprecation warning, one-minor grace.

## Security & Privacy Impact

- **Net positive** when paired with `metadata-only` redaction default for sensitive data classes.
- **Threat:** trace exporters leak PHI to vendor SaaS. Mitigation: workspace-level allowlist of exporters; healthcare default = file/OTLP-on-prem only.
- **Audit:** every exporter dispatch logged.

## Open Questions

- [ ] How to mirror gen_ai conventions in event-bus events (ADR-0005) without duplication.
- [ ] Streaming span events for partial outputs — semantic name for in-flight delta.
- [ ] Cost reporting: convert tokens → currency at span time vs export time (price drift).
- [ ] Tracking multi-agent patterns (RFC-0003) — flat span tree vs hierarchical with virtual parent?
