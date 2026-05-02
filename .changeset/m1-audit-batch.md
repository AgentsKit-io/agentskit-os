---
"@agentskit/os-core": minor
---

Add audit-log Merkle batch chain per ADR-0008. `AuditBatch` Zod schema with `prevBatchHash`, `merkleRoot`, `signedDigest`, `events: SignedEventRef[]`, and `signature` (ed25519). `AnchorRecord` for external anchoring (Rekor / git / custom URI). `AuditKeyCustody` enum (`local | hsm | external`). Pure helpers: `computeMerkleRoot()` (SHA-256 via Web Crypto, odd-count duplicates last), `computeBatchDigest()`, `verifyChain()` returns `{ ok: true } | { ok: false; break }` with typed `ChainBreak.code` (`genesis_invalid | prev_hash_mismatch | merkle_root_mismatch | digest_mismatch | signature_invalid`). Signature verification pluggable via `SignatureVerifier` interface — structural integrity always checked in-core. New subpath export `@agentskit/os-core/audit/batch`.
