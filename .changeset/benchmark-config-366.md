---
'@agentskit/os-dev-orchestrator': patch
---

#366: add `CodingBenchmarkConfig` with caller-supplied `rubricScore` and `successChecks` overrides on `runCodingAgentBenchmark`. Rubric scores are clamped to 0–100; success-check results surface on each row as `successPassed`.
