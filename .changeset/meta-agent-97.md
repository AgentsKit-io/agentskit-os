---
'@agentskit/os-core': patch
---

#97: add `MetaAgentSpec` schema (coordinator + children with roles, delegation strategy `auto`/`broadcast`/`pick-one`/`race`, maxIterations, shareScratchpad) plus `childRoleMap`. Pure schema; orchestrator runtime hooks the spec into the runner.
