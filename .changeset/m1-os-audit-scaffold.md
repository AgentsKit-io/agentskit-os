---
"@agentskit/os-audit": minor
---

Scaffold `@agentskit/os-audit` package — tamper-evident audit emitter per ADR-0008. Seventh public package.

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
