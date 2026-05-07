---
'@agentskit/os-core': patch
---

#175: add `buildShareLink` + `evaluateShareLink` — pure read-only share-link primitives with TTL (capped at 30d), scope (`flow` / `agent` / `run-trace`), and `oneTimeUse` flag. Verdict reports `expired` / `scope_mismatch` / `resource_mismatch` for failed checks.
