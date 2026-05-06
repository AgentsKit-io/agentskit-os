---
'@agentskit/os-core': patch
---

#55: add `forkAgentConfig` + `forkWorkspaceConfig` — pure helpers that clone an agent or workspace config with a new id, default `${name} (fork)` suffix, and a `forked-from:<source-id>` tag (deduped). Caller wires registry persistence on top.
