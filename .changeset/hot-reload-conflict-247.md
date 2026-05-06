---
'@agentskit/os-flow': patch
---

#247: add `detectHotReloadConflicts` — pure helper that compares an in-flight `HotReloadRunSnapshot` against a hot-reloaded flow definition and returns one conflict per node/edge that makes the swap unsafe (`node_removed_after_completion`, `node_kind_changed`, `inflight_node_changed`, `inflight_node_removed`, `checkpoint_edge_removed`).
