---
'@agentskit/os-observability': patch
---

#216: add `replayBisect` — pure binary-search bisector that walks a change history with a caller-supplied async `ReplayOracle` (returns `pass` / `fail`) and returns the earliest failing change index in ~log2(n) probes. Surfaces `culprit` / `all_clean` / `all_broken` / `inconsistent` so the CLI + observability UI can render a structured verdict.
