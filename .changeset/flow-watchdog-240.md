---
'@agentskit/os-flow': patch
---

#240: add `evaluateFlowWatchdog` — pure verdict function that ingests run heartbeats and decides `ok` / `restart` / `kill` per run based on a stall threshold, a hard-kill ceiling, and a max-restart budget.
