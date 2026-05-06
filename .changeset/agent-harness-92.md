---
'@agentskit/os-core': patch
---

#92: add `createAgentHarness` — pure in-memory state machine for `spawn` / `markRunning` / `migrate` / `kill` / `markFailed` of agent handles. Maintains per-handle audit log so dashboards can replay every transition; caller wires real subprocess / cloud-pod side effects on top.
