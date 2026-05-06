---
'@agentskit/os-core': patch
---

#93: add `buildTopologyPlan` + `TOPOLOGY_IDS` — pure builder for `star` / `ring` / `mesh` / `pipeline` multi-agent topologies. Returns `TopologyPlan` (nodeIds + FlowEdge[] + entry) the runtime feeds into the standard FlowConfig; visual layout is left to the visual editor.
