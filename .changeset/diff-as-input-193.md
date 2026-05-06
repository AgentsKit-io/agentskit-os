---
'@agentskit/os-flow': patch
---

#193: add `createGitDiffNodeHandler` — adapter that turns a caller-supplied `GitDiffExecutor` into a flow tool-node handler for the built-in `tools.git.diff` primitive. Accepts either a parsed `GitDiffResult` or a raw unified-diff patch (parsed via `parseUnifiedGitDiff`) and surfaces structured failures.
