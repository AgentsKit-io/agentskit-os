---
"@agentskit/os-core": minor
---

Add pure config utilities under `config/`:

- `config/merge` — 5-layer merge per ADR-0003 (`defaults → global → workspace → env → runtime`). Plain-object deep merge; arrays replace, not concatenate. `buildProvenance` reports which layer set each leaf.
- `config/migrate` — versioned migration framework. Strict 1-version increments via registered `MigrationStep[]`. Typed `MigrationError` codes (`config.future_version`, `config.migration_gap`, `config.migration_skip`, `config.migration_invalid_output`).
- `config/diff` — structural diff over plain objects. Emits typed `ConfigChangeOp` (`add | remove | replace`). Arrays treated as opaque values. Powers `agentskit-os config diff` CLI command later.

Pure functions only — no FS, no I/O. Loaders (TS/YAML/GUI/env/CLI) live in higher packages and feed objects here.

New subpath exports `@agentskit/os-core/config/{merge,migrate,diff}`.
