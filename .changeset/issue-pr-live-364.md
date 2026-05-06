---
'@agentskit/os-dev-orchestrator': patch
---

#364: add `runIssueToPrPipeline` with explicit `dry-run` and `live` modes. Live mode runs a single `CodingAgentProvider` through `runCodingAgentBenchmark` and surfaces both the plan trace and the benchmark report alongside the PR draft metadata. No remote PR is pushed.
