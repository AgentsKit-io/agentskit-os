---
"@agentskit/os-audit": minor
---

Add `FileBatchStore` — file-backed `BatchStore` impl. Per-workspace JSONL append (one line per `AuditBatch`). Validates `prevBatchHash` continuity before appending — rejects out-of-chain with `chain break` error. Skips corrupt JSONL lines silently on load (any tamper detected by `verifyChain`).

Pluggable `FileSystem` adapter (defaults to `node:fs/promises` via `nodeFs()`, accepts in-memory fakes for tests). `safeWorkspaceId(id)` exported helper.

Round-trip verified: emitter → file store → load → `verifyChain` returns `ok` for multi-batch chains.

New subpath modules: `src/file-batch-store.ts`, `src/fs.ts`.
