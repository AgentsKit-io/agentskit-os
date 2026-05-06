---
'@agentskit/os-flow': patch
---

#243: add `runWithGracefulDegradation` — runs prioritized attempts sequentially until one succeeds and surfaces a per-attempt outcome trail (`ok` / `fail` / `skipped`) so callers can record which fallback won. Honours an optional `AbortSignal` and `enabled` gate per attempt.
