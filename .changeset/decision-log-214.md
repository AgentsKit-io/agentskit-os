---
'@agentskit/os-observability': patch
---

#214: add `DecisionLogEntry` shape + `buildDecisionLogEntry` + `filterDecisionLog` — pure primitives that capture "why did the agent pick tool/branch/sub-flow X" with rationale, alternatives, and confidence so the runtime + UI can render a decision log per run.
