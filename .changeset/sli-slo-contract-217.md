---
'@agentskit/os-core': patch
---

#217: add `SliSloContract` schema (latency, error/success rate, cost, throughput) plus `evaluateSliSloContract` — pure verdict function that aggregates samples (percentile, mean, sum) and returns `pass` / `fail` / `insufficient_data` per SLO so the runtime can attach SLO compliance to a run report.
