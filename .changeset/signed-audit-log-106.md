---
'@agentskit/os-core': patch
---

#106: add `buildSignedAuditBatch` — assembles a schema-valid `AuditBatch` from raw events by computing the Merkle root and canonical signed digest, then delegating signature production to a caller-supplied `AuditSigner`. Pairs with `nextPrevBatchHash` for chaining and `createNullAuditSigner` for tests.
