---
'@agentskit/os-core': minor
---

Add `AgentRegistryEntry` contract for governance metadata (owner, purpose, lifecycle state, risk tier, capabilities, deps, environments, SLO/SLA refs) and add `KnowledgeGovernance` to `RagPipeline` (owner, sensitivity/trust, freshness/expiry, citation policy, allowlisted agents). `ConfigRoot` now validates `agentRegistry` agentId refs and enforces `rag.pipelines[].governance.allowedAgents` when present.

Also add `WorkspaceKind` (`personal|team|client`) plus optional `WorkspaceConfig.client` metadata for client-isolated workspaces.

