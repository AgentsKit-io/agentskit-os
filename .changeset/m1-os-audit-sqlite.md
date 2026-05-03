---
"@agentskit/os-audit": minor
---

Add `SqliteBatchStore` — SQLite-backed `BatchStore` impl. Mirrors `FileBatchStore` semantics (enforces `prevBatchHash` chain continuity on append, skips corrupt rows silently on load, isolates workspaces) but persists into a single transactional file instead of one JSONL per workspace.

Driver-agnostic: depends only on a minimal `SqliteDatabase` interface (`prepare` + `exec`) matching the better-sqlite3 shape. No native dep added; embedders pass `new Database(path)`.

Schema:

```
CREATE TABLE agentskitos_audit_batches (
  workspace_id TEXT, seq INTEGER,
  batch_json TEXT, signed_digest TEXT,
  PRIMARY KEY (workspace_id, seq)
)
```

Custom table name supported and validated against `^[a-zA-Z_][a-zA-Z0-9_]*$` to prevent SQL injection through table-name interpolation.

9 new tests; round-trip with `AuditEmitter` + `verifyChain` passes for multi-batch chains.
