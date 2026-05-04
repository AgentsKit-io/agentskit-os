---
'@agentskit/os-cli': patch
---

Migrate `version`, `init`, `lock`, `sync`, `flow export`, `flow import-json`, `agent register`, and `agent promote` to Commander with `runCommander`; keep `runSync(argv, io, opts)` for tests. Align help and usage assertions with Commander output.
