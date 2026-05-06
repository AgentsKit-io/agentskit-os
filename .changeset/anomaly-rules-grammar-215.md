---
'@agentskit/os-core': patch
---

#215: add `AnomalyRuleSet` grammar (`metric` × `op` × threshold/window) plus `evaluateAnomalyRules`. Supports `gt`/`gte`/`lt`/`lte`, `spike_x`/`drop_x` against a baseline window, and `absent`. Returns one `AnomalyAlert` per tripped rule.
