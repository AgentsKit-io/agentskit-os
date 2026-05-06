---
'@agentskit/os-core': patch
---

#101: add `createSelfHealingLedger` — pure per-agent crash counter with window decay. Returns one verdict per `record(crash)` (`continue` / `clone-debug` / `quarantine`); defaults trigger debug clone at 3 crashes, quarantine at 5, with a 30-minute decay window.
