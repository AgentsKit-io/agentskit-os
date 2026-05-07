---
'@agentskit/os-headless': minor
---

Phase A-4: add `createTriggerScheduler` (cron dispatch loop with pluggable `computeNext` and `dispatch`) and `createFileWatchDaemon` (debounced `node:fs/promises.watch` wrapper). `defaultComputeNext` handles `* * * * *` and `*/N * * * *` and falls back to 60s for unknown cron expressions. Both daemons surface `TriggerEvent`s through the registry-style `dispatch` callback so the desktop sidecar can route them into `HeadlessRunner`.
