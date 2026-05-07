---
'@agentskit/os-core': patch
---

#245: add `SnapshotRetentionPolicy` schema (cadence × keepLast × maxAgeDays) plus `planSnapshotRetention` — pure pruner that splits records into keep/delete with per-snapshot reason (`older_than_max_age` / `beyond_keep_last`).
