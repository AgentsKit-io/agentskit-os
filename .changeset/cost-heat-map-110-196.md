---
'@agentskit/os-observability': patch
---

#110 + #196: add `buildCostHeatMap` — pure aggregator that turns a stream of `CostHeatSample`s (timestamp + costUsd + tags) into a sorted set of `CostHeatCell`s partitioned by `partitionTagPrefix` (e.g. `'team:'` to bucket by Principal team) and bucketed by minute / hour / day. `totalCostForTag` sums every cell for a single tag.
