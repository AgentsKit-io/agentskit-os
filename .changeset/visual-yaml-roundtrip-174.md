---
'@agentskit/os-core': patch
---

#174: add fixture-driven GUI ↔ YAML round-trip parity tests covering linear, branching/condition, parallel + vote, and retry-policy flows. Asserts both `assertVisualFlowRoundTrip` equality and JSON-canonical wire stability so visual editor regressions surface as named fixture diffs.
