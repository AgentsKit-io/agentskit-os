# @agentskit/os-audit

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- 54d9f3d: Add `FileBatchStore` — file-backed `BatchStore` impl. Per-workspace JSONL append (one line per `AuditBatch`). Validates `prevBatchHash` continuity before appending — rejects out-of-chain with `chain break` error. Skips corrupt JSONL lines silently on load (any tamper detected by `verifyChain`).

  Pluggable `FileSystem` adapter (defaults to `node:fs/promises` via `nodeFs()`, accepts in-memory fakes for tests). `safeWorkspaceId(id)` exported helper.

  Round-trip verified: emitter → file store → load → `verifyChain` returns `ok` for multi-batch chains.

  New subpath modules: `src/file-batch-store.ts`, `src/fs.ts`.

- f4436c7: Scaffold `@agentskit/os-audit` package — tamper-evident audit emitter per ADR-0008. Seventh public package.

  `hashEvent(event)` — produces `SignedEventRef` (eventId + sha256 hex) via canonical JSON.

  `BatchStore` interface with `InMemoryBatchStore` reference impl. Per-workspace chain. `append` enforces `prevBatchHash` continuity (rejects out-of-chain batches with `chain break` error). `latestDigest` returns genesis (64 zeros) for empty workspaces.

  `AuditEmitter`:

  - Per-workspace event buffers
  - Flush triggers: `maxEventsPerBatch` (default 1000) or `maxIntervalMs` (default 60s)
  - Pluggable `Signer` interface (no crypto in package — caller injects ed25519 implementation)
  - Computes Merkle root + signedDigest via `os-core` helpers
  - Builds `AuditBatch` records that pass `verifyChain` end-to-end
  - `close()` flushes pending + freezes ingests
  - `pending(workspaceId)` for monitoring

  Consumes `@agentskit/os-core` as `peerDependency`.

- c842c12: Add `SqliteBatchStore` — SQLite-backed `BatchStore` impl. Mirrors `FileBatchStore` semantics (enforces `prevBatchHash` chain continuity on append, skips corrupt rows silently on load, isolates workspaces) but persists into a single transactional file instead of one JSONL per workspace.

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

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
