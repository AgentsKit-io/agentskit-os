---
'@agentskit/os-cli': minor
'@agentskit/os-dev-orchestrator': minor
'@agentskit/os-flow': minor
'@agentskit/os-headless': minor
'@agentskit/os-observability': minor
'@agentskit/os-observability-otel': minor
'@agentskit/os-runtime': minor
---

Live trace cost meter, run cancellation, coding-agent task reports, and
delegated-run artifacts. Adds:

- Cost ticks on flow trace events; live aggregate exposed through headless +
  observability bridges.
- `cancelRun` API on flow runtime + propagation through dev-orchestrator,
  observability, and CLI.
- Coding-agent task report builder (delegation + benchmark) with markdown +
  JSON serialization, dashboard payload, failure classification.
- Per-shard run artifacts written through `coding-run-artifacts` with
  redacted task request/result + git diff summary.
