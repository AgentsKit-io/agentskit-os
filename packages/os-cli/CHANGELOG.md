# @agentskit/os-cli

## 3.0.0-alpha.1

### Minor Changes

- 84d2fed: feat(os-core): WorkspaceConfig.dataResidency field (#183)
  feat(os-core): RepoRef primitive — git URL + ref + worktree path (#189)
  feat(os-core): per-trigger budget override via effectiveLimitsFor (#192)
  docs(adr): CLI verb surface ADR-0017 + man-page generator (#181)
- e8e42b4: feat(os-cli): doctor tests live LLM call + sandbox round-trip (#225)

  Extends `packages/os-cli/src/commands/doctor.ts`:

  - New `--live` flag (default off). When set, doctor runs two extra checks:
    1. **Live LLM probe** — calls a host-injected `DoctorLlmAdapter.invoke()` with a tiny "ping" prompt (max 8 tokens), verifies the response shape. 10 s timeout, error code `os.cli.doctor_live_timeout`.
    2. **Sandbox round-trip** — spawns a no-op command through a host-injected `DoctorSandboxSpawner` and confirms the child exits 0. 5 s timeout, same error code.
  - Both probes use dependency injection (`createDoctor(liveOpts?)`) so tests use fast fakes without spawning real processes or hitting real LLMs.
  - Output adds `live:llm` and `live:sandbox` lines to the doctor report.
  - Without `--live`, behaviour is unchanged.
  - Exports `createDoctor`, `runDoctor`, `DoctorLlmAdapter`, `DoctorSandboxSpawner`, `DoctorLiveOpts`, `LiveChecks`, `DoctorReport`.

  feat: @agentskit/os-headless — first-class headless runner (initial release) (#223)

  New public package `@agentskit/os-headless` (`distribution: public`, `stability: alpha`).

  Provides the **first-class headless agent runner** — bridge between a workspace config and a running agent without any UI.

  Public surface:

  - `createHeadlessRunner(opts)` → `HeadlessRunner` with `runFlow`, `runAgent`, `dispose`.
  - `runWorkspace(opts)` — convenience single-call wrapper.
  - `runFlowHeadless` — alias for `runWorkspace`.

  Key behaviours:

  - Live modes (`real`, `deterministic`) use `buildLiveHandlers` from `os-runtime`.
  - Stub modes (`dry_run`, `simulate`, `replay`, `preview`) use `defaultStubHandlers` from `os-flow`.
  - `dispose()` flushes audit batches via `AuditEmitter.flushAll()`.
  - Cancellation via `AbortSignal` propagated to `os-flow` runner.
  - Flow lookup from `Map<string, FlowConfig>` or `Record<string, FlowConfig>`; accepts `FlowConfig` directly.
  - Observability hook forwarded to `os-flow` `onEvent`.

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1
  - @agentskit/os-flow@1.0.0-alpha.1
  - @agentskit/os-import@1.0.0-alpha.1
  - @agentskit/os-marketplace-sdk@1.0.0-alpha.1
  - @agentskit/os-storage@1.0.0-alpha.1
  - @agentskit/os-templates@1.0.0-alpha.1

## 3.0.0-alpha.0

### Minor Changes

- 42eff55: Add `agentskit-os deploy [<bundle>] [--assets <dir>] [--publisher <name>] [--dry-run]` — pairs with `agentskit-os publish` to close the publish-then-ship loop.

  Default flow:

  - Reads `<bundle>` (default `./agentskit-os.bundle.json`)
  - Re-reads sibling `dist/` (override via `--assets`)
  - Verifies each asset's size + SHA-256 against the bundle metadata
  - Concatenates verified bytes into an archive
  - Hands `(bundle, archive)` to the configured `Publisher`

  Publishers in M1: `in-memory` (default). M5 adds `npm`, `github`, `http`.

  `--dry-run` skips the publisher call but still runs full integrity verification — safe to use in CI.

  Exit codes: 0 ok, 1 build error, 2 usage, 3 read error, 4 integrity error, 5 publisher rejected.

  15 new tests including positive (verify + ship), tampered asset (size mismatch and hash mismatch with same size), missing asset, malformed bundle, override flags, and help/usage paths.

- 496613f: Add `agentskit-os import <input> [--out] [--source] [--workspace] [--quiet]` command. Wires `@agentskit/os-import` into CLI per Epic 2 C-5.

  - Reads JSON/YAML input via shared loader
  - Auto-detects importer (n8n / Langflow / Dify) or honors `--source` override
  - Translates to `ConfigRoot`, validates against schema, emits as YAML
  - Prints to stdout by default; `--out <path>` writes to file
  - `--workspace <id>` overrides imported workspace id
  - `--quiet` suppresses warning summary
  - Reports translation errors with code 1, usage errors with 2

  `@agentskit/os-import` added as `peerDependency`.

- e496ac7: Add `init` command. Scaffolds an AgentsKitOS workspace: writes `agentskit-os.config.yaml` (minimal valid `ConfigRoot`), creates `.agentskitos/` runtime directory, and adds a `.gitignore` if missing. Inferred `id` is slugified `basename(<dir>)`. `--id`, `--name`, `--force`, and a positional `<dir>` flags supported. Output config round-trips through `config validate`.

  `CliIo` extended with `writeFile`, `mkdir`, and `exists` (Node-fs implementations in `defaultIo`, fake-fs helper in tests).

- 4e32014: Add `agentskit-os lock <config-path> [--check] [--out <path>]` command. Generates `agentskit-os.lock` next to the config (or at `--out`) covering plugins, agents, flows, providers, schemas. Uses `canonicalJson` + `sha256OfCanonical` from `@agentskit/os-core/lockfile/lock`.

  `--check` mode loads existing lockfile, runs `detectLockDrift` against current config + plugins, exits 5 with typed drift codes if mismatch. Exits 0 when matches.

  Exit codes: 0 ok / no drift, 1 invalid config, 2 usage, 3 read, 5 drift detected.

- 6e2c8fe: Add `agentskit-os new <template-id> [<dir>]` command. Wires `@agentskit/os-templates` into CLI for one-command scaffolding from the starter gallery.

  Flags:

  - `--list` — browse all available templates with category + difficulty
  - `--id <slug>` / `--name <name>` — override workspace identity
  - `--force` — overwrite existing config
  - `<dir>` positional defaults to cwd; when set, workspace id derived from basename

  Outputs an `agentskit-os.config.yaml` with template's `agents[]` + `flows[]` baked in. Round-trips cleanly through `config validate`. Surfaces `Next:` hints pointing at the template's first flow id for `agentskit-os run`.

  Exit codes: 0 ok, 2 usage / unknown template, 4 file exists.

  `@agentskit/os-templates` added as `peerDependency`.

- 803ea58: Add `agentskit-os publish [<dir>] [--manifest] [--assets] [--out] [--unsigned]` command. Wires `@agentskit/os-marketplace-sdk` into CLI.

  Builds a marketplace bundle from a plugin source directory. Default flow:

  - Reads `<dir>/agentskit-os.plugin.yaml` as manifest
  - Reads `<dir>/dist/` as flat asset directory
  - Writes `<dir>/agentskit-os.bundle.json` with manifest + per-asset SHA-256 + bundle SHA-512

  Refuses unsigned manifests by default. `--unsigned` allows dev/internal bundles.

  `CliIo` extended with optional `readBinary` + `readdir`. Fake IO updated to mirror.

  Real upload to npm / GitHub / marketplace HTTP lands in M5 via `os-marketplace-sdk` Publisher backends.

  Exit codes: 0 ok, 1 build error, 2 usage, 3 read error.

  `@agentskit/os-marketplace-sdk` added as `peerDependency`.

- 0763257: Wire `@agentskit/os-storage` into `agentskit-os run`. Two new flags:

  - `--store <dir>` — enable durable mode; persist checkpoints via `FileCheckpointStore` at `<dir>`. Switches runner from `runFlow` to `resumeFlow`.
  - `--resume <runId>` — restore a prior run from checkpoints (requires `--store`). Reuses the given `runId` instead of generating a new one.

  Output header annotates `(durable)` when `--store` is set. `node:resumed` events render as `✓ <id> (resumed)` in trace.

  `@agentskit/os-storage` added as `peerDependency`.

- 1f23e4a: Add `agentskit-os run <config> --flow <id> [--mode] [--workspace] [--quiet]` command. Loads + validates config, picks the named flow, builds a `RunContext` with new `runId`, registers `defaultStubHandlers` for the run mode (default `dry_run`), and executes via `@agentskit/os-flow`. Streams per-node trace to stdout (suppressible with `--quiet`). Exit codes: 0 ok, 1 failed/invalid, 2 usage, 3 read, 4 paused.

  `@agentskit/os-flow` added as `peerDependency`.

- c9b8e50: Add `--estimate` and `--force` flags to `agentskit-os run`.

  Implements issue #198: pre-flight cost estimate UI + block-on-budget-exceed.

  **New flags:**

  - `--estimate` — print a pre-flight cost breakdown table for the selected flow and exit (code 0). Does NOT execute the flow.
  - `--force` — skip the `WorkspaceLimits` budget check. Intended for CI override scenarios (audited).

  **Budget enforcement:**

  When `workspace.limits.tokensPerRun` or `workspace.limits.usdPerRun` is configured and the pre-flight estimate exceeds it, `agentskit-os run` exits with code `5` (`os.cli.run_budget_exceeded`) before any nodes execute. `--force` bypasses the check.

  **Estimate table format:**

  ```
  cost estimate  flow=pr-review  workspace=team-a
  Node                    Agents                          Tokens    Est. USD
  ------------------------------------------------------------------------
  review                  reviewer                        4000      $0.020000
  ------------------------------------------------------------------------
  TOTAL                                                   4000      $0.020000
  ```

  **Price table note:**

  The CLI estimate uses an empty price table by default (all USD estimates are $0 until a host registers model prices via `PriceMap`). Token counts are always computed from agent `maxTokens` (or `defaultModelTokens=2000` when absent). This is intentional — the estimator is a pure pre-flight check and does not make network calls.

  **Exit codes:**

  - `0` — estimate printed, or run completed
  - `5` — budget exceeded (new); use `--force` to override

- 7bc50bd: Add `agentskit-os sync` command — keep core/plugins in sync with lockfile (issue #28).

  - `agentskit-os sync` (no args / `--check`): reads `agentskit-os.lock`, compares declared plugin versions against installed packages, exits 1 if drift found.
  - `agentskit-os sync --apply`: installs/upgrades packages to match the lockfile, then re-verifies.
  - `agentskit-os sync --plugins-only` / `--core-only`: narrow the drift check to a subset.
  - `--lock <path>`: override lockfile path.

  Exports `Synchronizer` interface + `pnpmSynchronizer` default for host injection in tests and custom runtimes. Pure `computeDrift` function is independently testable. Structured error codes: `os.cli.sync_drift`, `os.cli.sync_missing_lockfile`, `os.cli.sync_install_failed`.

  Exit codes: 0 = in sync, 1 = drift / error, 2 = usage error.

### Patch Changes

- 8167412: Internal: ADR-0014 publish vs bundle policy. Three distribution tiers — `public` (npm published, plugin authors compile against), `bundled-private` (`"private": true`, ships inside Tauri desktop bundle, not on npm), `internal-only` (tooling/fixtures, neither bundled nor published). All current packages declare `agentskitos.distribution: "public"`. CI lint `scripts/check-distribution.mjs` enforces field presence + private-flag pairing. No public API change.
- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [ca6b190]
- Updated dependencies [b0b7295]
- Updated dependencies [9019a89]
- Updated dependencies [6da430a]
- Updated dependencies [fd329a6]
- Updated dependencies [1c2e0e4]
- Updated dependencies [bfea4e7]
- Updated dependencies [1cf7cf9]
- Updated dependencies [14bd719]
- Updated dependencies [90dc3da]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [c9b8e50]
- Updated dependencies [2c2fd18]
- Updated dependencies [cdfd821]
- Updated dependencies [1ec4e30]
- Updated dependencies [11ce6e7]
  - @agentskit/os-core@0.4.0-alpha.0
  - @agentskit/os-flow@1.0.0-alpha.0
  - @agentskit/os-import@1.0.0-alpha.0
  - @agentskit/os-marketplace-sdk@1.0.0-alpha.0
  - @agentskit/os-storage@1.0.0-alpha.0
  - @agentskit/os-templates@1.0.0-alpha.0

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
