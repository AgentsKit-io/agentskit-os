---
'@agentskit/os-core': patch
---

#107: add `evaluateCostGuard` — pure verdict that compares cumulative `CostUsage` (daily/monthly/per-agent) against the workspace `CostQuota` and returns `allow` / `warn` / `deny` plus the nearest-cap utilization for telemetry. Default warn threshold is 80% utilization; configurable via `warnAt`.
