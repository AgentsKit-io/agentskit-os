---
'@agentskit/os-cli': patch
'@agentskit/os-templates': patch
---

Refactor `dev worktree`, `coding-agent conformance`, `mcp discover`, and `trigger preset` to use Commander; add `flow new` with Commander plus Ink-rendered `--list`; fix `runCommander` so `program.error` exit codes (e.g. unknown preset → 1) are preserved; register topology and dev-orchestrator template packs with valid flow schemas and metadata; make `mcp discover` test deterministic via a spy.
