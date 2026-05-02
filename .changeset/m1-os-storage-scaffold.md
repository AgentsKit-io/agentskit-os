---
"@agentskit/os-storage": minor
---

Scaffold `@agentskit/os-storage` package — file-backed storage adapters. Pure node:fs (no native deps). Fifth public package.

`FileCheckpointStore` implements `CheckpointStore` from `@agentskit/os-flow`. Per-run JSONL files (one line per checkpoint), atomic append. Methods: `append`, `load`, `clear`, `listRuns`. Run id sanitized for filename safety. Skips corrupt JSONL lines silently.

`LockfileStore` — read/write `agentskit-os.lock` via YAML. Validates against `os-core` lockfile schema on read. Optional header line support for write (e.g. tool comment).

`FileSystem` adapter interface — defaults to `node:fs/promises` via `nodeFs()`, accepts in-memory fakes for hermetic tests. `safeRunId(id)` exported helper.

Consumes `@agentskit/os-core` + `@agentskit/os-flow` as `peerDependency`. `yaml` as direct dependency.
