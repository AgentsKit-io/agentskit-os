---
'@agentskit/os-headless': minor
---

Phase A-1: add `loadWorkspaceConfig` + `resolveWorkspacePath` — disk-driven workspace loader (YAML or JSON). Discovery order: explicit path → `AGENTSKIT_WORKSPACE` env → `~/.agentskitos/workspace.{yaml,json}`. Parses the `workspace` block through `parseWorkspaceConfig` and surfaces `secrets` + inline `agents` / `flows` / `triggers` blocks. The desktop sidecar now bootstraps the runner with the loaded workspace id/name (falling back to the desktop default when no file is found) and exposes `workspace.get` over JSON-RPC for the UI.
