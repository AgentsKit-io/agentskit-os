---
'@agentskit/os-core': patch
---

#122: add `transitionSyncState` + `computeSyncDelta` — pure cloud-sync state machine (`idle` / `pulling` / `pushing` / `conflicted` / `synced` / `errored`) with explicit allowed-edge enforcement, and a delta computer that diffs id→hash maps into `localOnly` / `remoteOnly` / `diverged` buckets.
