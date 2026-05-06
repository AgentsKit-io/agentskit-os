---
'@agentskit/os-core': patch
---

#91: add `extractAgentGenSpec` + `AgentGenSpec` schema — heuristic NL → structured-spec extractor that detects intent (`agent` / `pipeline` / `trigger` / `tools` / `mixed`), tool/trigger keyword hints, domain tags, and a deterministic `suggestedSlug`. Pure; the LLM still does final generation, this seed narrows the prompt template set.
