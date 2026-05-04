---
'@agentskit/os-cli': patch
---

Migrate remaining user-facing commands to Commander with `runCommander`: `version`, `init`, `lock`, `sync`, `flow export`, `flow import-json`, `agent register`, `agent promote`, `wizard`, `new`, `import`, `run`, `publish`, `deploy`, `agent bump`, `agent diff`, `agent version-list`, and `agent changelog`. Keep `runSync(argv, io, opts)` for tests. Align help and usage assertions with Commander output (help on stdout; `unknown option` vs `unknown flag`).
