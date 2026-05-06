---
'@agentskit/os-observability': patch
---

#104: add `createLangfuseExporter` + `createPostHogExporter` — `SpanExporter` adapters that ship to Langfuse `/api/public/ingestion` and PostHog `/capture/`. Both accept a caller-supplied `http` injector (no SDK dependency), surface errors via `onError`, and expose pure `spanToLangfuseEvent` / `spanToPostHogEvent` mappers for advanced transports. OOTB trace-viewer wiring.
