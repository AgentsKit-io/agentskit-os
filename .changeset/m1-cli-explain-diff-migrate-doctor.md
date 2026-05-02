---
"@agentskit/os-cli": minor
---

Add four new commands:

- `config explain --<layer> <path>...` — merges multi-layer config per ADR-0003 and prints provenance per leaf via `buildProvenance`.
- `config diff <prev> <next>` — structural diff via `diffConfigs`. Output: `+ add`, `- remove`, `~ replace`.
- `config migrate <path> [--to <version>]` — migrates via `migrateConfig`. Defaults `--to` to `CONFIG_ROOT_VERSION`. Reports typed `MigrationError` codes.
- `doctor` — diagnose CLI environment: node version (≥22 required), platform, linked `@agentskit/os-core`, `AGENTSKITOS_HOME`. Exit 0 when all checks pass, 1 otherwise.

`config-validate` refactored to use shared `loadConfigFile` from `loader.ts`.
