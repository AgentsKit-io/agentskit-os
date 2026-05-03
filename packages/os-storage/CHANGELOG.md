# @agentskit/os-storage

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1
  - @agentskit/os-flow@1.0.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- 1cf7cf9: Scaffold `@agentskit/os-storage` package — file-backed storage adapters. Pure node:fs (no native deps). Fifth public package.

  `FileCheckpointStore` implements `CheckpointStore` from `@agentskit/os-flow`. Per-run JSONL files (one line per checkpoint), atomic append. Methods: `append`, `load`, `clear`, `listRuns`. Run id sanitized for filename safety. Skips corrupt JSONL lines silently.

  `LockfileStore` — read/write `agentskit-os.lock` via YAML. Validates against `os-core` lockfile schema on read. Optional header line support for write (e.g. tool comment).

  `FileSystem` adapter interface — defaults to `node:fs/promises` via `nodeFs()`, accepts in-memory fakes for hermetic tests. `safeRunId(id)` exported helper.

  Consumes `@agentskit/os-core` + `@agentskit/os-flow` as `peerDependency`. `yaml` as direct dependency.

- 14bd719: Add `SqliteCheckpointStore` — durable run state in SQLite, alternative to `FileCheckpointStore` for embedders/desktop builds wanting a single transactional file.

  Driver-agnostic: depends only on a minimal `SqliteDatabase` interface (`prepare` + `exec`) that matches the better-sqlite3 shape. Embedders pass `new Database(path)`; tests pass any matching fake. No native dep added to the package.

  Schema:

  ```
  CREATE TABLE agentskitos_checkpoints (
    run_id TEXT, seq INTEGER, node_id TEXT,
    outcome_json TEXT, recorded_at TEXT,
    PRIMARY KEY (run_id, seq)
  )
  ```

  Behaviors:

  - `append` allocates `seq = MAX(seq) + 1` per run for monotonic ordering
  - `load` returns records sorted by seq
  - Corrupt rows skipped silently (caller detects via missing nodes)
  - `clear` deletes only the target run
  - `listRuns` returns distinct ids in sorted order
  - Custom table name supported; validated against `^[a-zA-Z_][a-zA-Z0-9_]*$` to prevent SQL injection

  10 new tests.

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [9019a89]
- Updated dependencies [6da430a]
- Updated dependencies [fd329a6]
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
