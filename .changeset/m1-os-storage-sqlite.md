---
"@agentskit/os-storage": minor
---

Add `SqliteCheckpointStore` — durable run state in SQLite, alternative to `FileCheckpointStore` for embedders/desktop builds wanting a single transactional file.

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
