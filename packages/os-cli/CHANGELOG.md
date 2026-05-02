# @agentskit/os-cli

## 2.0.0

### Patch Changes

- Updated dependencies [5638f27]
- Updated dependencies [90be5f3]
  - @agentskit/os-core@0.3.0

## 1.0.0

### Minor Changes

- 11696d9: Add four new commands:

  - `config explain --<layer> <path>...` — merges multi-layer config per ADR-0003 and prints provenance per leaf via `buildProvenance`.
  - `config diff <prev> <next>` — structural diff via `diffConfigs`. Output: `+ add`, `- remove`, `~ replace`.
  - `config migrate <path> [--to <version>]` — migrates via `migrateConfig`. Defaults `--to` to `CONFIG_ROOT_VERSION`. Reports typed `MigrationError` codes.
  - `doctor` — diagnose CLI environment: node version (≥22 required), platform, linked `@agentskit/os-core`, `AGENTSKITOS_HOME`. Exit 0 when all checks pass, 1 otherwise.

  `config-validate` refactored to use shared `loadConfigFile` from `loader.ts`.

- 41e9301: Add `init` command. Scaffolds an AgentsKitOS workspace: writes `agentskit-os.config.yaml` (minimal valid `ConfigRoot`), creates `.agentskitos/` runtime directory, and adds a `.gitignore` if missing. Inferred `id` is slugified `basename(<dir>)`. `--id`, `--name`, `--force`, and a positional `<dir>` flags supported. Output config round-trips through `config validate`.

  `CliIo` extended with `writeFile`, `mkdir`, and `exists` (Node-fs implementations in `defaultIo`, fake-fs helper in tests).

- 4d5f103: Scaffold `@agentskit/os-cli` package. First commands: `config validate <path>` (YAML or JSON), `--version`, `--help`. Two-segment command routing (e.g. `config validate`). Pluggable `CliIo` for testability — all router behavior covered by unit tests without touching the real filesystem. Consumes `@agentskit/os-core` as a peer dependency per ADR-0002.

### Patch Changes

- Updated dependencies [3a3a758]
- Updated dependencies [ce66961]
- Updated dependencies [14b572c]
- Updated dependencies [d12e33e]
- Updated dependencies [6ec36ab]
- Updated dependencies [ecf6e45]
- Updated dependencies [b981e69]
- Updated dependencies [f1b65fb]
- Updated dependencies [da7d3ce]
- Updated dependencies [31eba8d]
- Updated dependencies [51c6f12]
- Updated dependencies [66066b1]
- Updated dependencies [2201a66]
  - @agentskit/os-core@0.2.0
