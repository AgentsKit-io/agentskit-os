---
"@agentskit/os-core": minor
---

Implement RFC-0006 OpenTelemetry GenAI semantic conventions. Pure constants + Zod validators; no OTel SDK dependency. Exporters in os-observability translate these into SDK calls.

`GenAiAttr` namespace exposes stable attribute names (`gen_ai.system`, `gen_ai.operation.name`, `gen_ai.request.*`, `gen_ai.response.*`, `gen_ai.usage.*`, `server.*`, `error.type`). OS extensions namespaced under `agentskitos.*` (workspace_id, run_id, run_mode, agent_id, flow_id, node_id, principal_id, cost_usd, cache_hit, consent_ref_id, brand_kit_id) — covers gaps without forking the standard.

`GEN_AI_OPERATION_NAMES` (chat/completion/embedding/tool/agent/rerank). `GEN_AI_FINISH_REASONS` (stop/length/tool_calls/content_filter/error). `GenAiSpanAttributes` Zod schema with passthrough for non-genai attributes. BigInt usage tokens auto-coerced to number.

Adapter helpers: `buildRequestAttributes(req, hints?)`, `buildResponseAttributes(res, hints?)`, `spanName(op, target?)`. `SEMCONV_VERSION = '1.29.0'`.

New subpath export `@agentskit/os-core/obs/gen-ai-semconv`.
