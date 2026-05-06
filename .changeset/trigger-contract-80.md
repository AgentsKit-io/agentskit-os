---
'@agentskit/os-core': patch
---

#80: add `TriggerContract` + `createTriggerRegistry` — runtime contract every trigger backend implements (kind/displayName/validate/dispatch) and an in-memory registry plugins call to add new trigger kinds. The registry routes incoming `TriggerEvent`s to the contract that owns the kind, surfacing `dispatched` / `skipped` / `failed` outcomes.
