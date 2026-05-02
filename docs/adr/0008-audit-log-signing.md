# ADR-0008 — Audit Log Signing (Tamper-Evident)

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

SOC2 / HIPAA / GDPR all require tamper-evident audit logs. ADR-0005 §6 declares `system.audit.*` is "append-only, signed batches" but does not specify the chain. Healthcare + finance + enterprise all blocked without spec. Impl can be deferred (M6 O-3) but contract must land M1 so producers emit correctly from day 1.

## Decision

### 1. Hash-linked Merkle batch chain

Audit events accumulate into batches (default: 60s window or 1k events, whichever first). Each batch:

```ts
AuditBatch {
  batchId: Ulid
  workspaceId: Slug
  startedAt: ISO8601
  endedAt: ISO8601
  prevBatchHash: hex64                // SHA-256 of previous batch's signedDigest
  events: SignedEventRef[]            // {eventId, eventHash}
  merkleRoot: hex64                   // root of events
  signedDigest: hex64                 // sign(merkleRoot || prevBatchHash || metadata)
  signature: { algorithm: 'ed25519', publicKey, signature }
  schemaVersion: 1
}
```

Genesis batch: `prevBatchHash = '0'.repeat(64)`. Chain break = detectable.

### 2. Key custody — three modes

| Mode | Where keys live | Use |
|---|---|---|
| `local` | OS keychain (macOS Keychain, Windows DPAPI, Linux secret-service) | Default, single-user |
| `hsm` | PKCS#11 / cloud KMS (AWS KMS, GCP KMS, Azure Key Vault) | Enterprise, regulated |
| `external` | Plugin-provided signer (e.g. Sigstore Fulcio, transparency log) | Compliance + public verifiability |

Key rotation: new keypair per quarter. Old public keys retained in `audit/keys/` for verification of historical batches.

### 3. Anchoring

Optional periodic anchor: latest `signedDigest` published to external transparency log (Sigstore Rekor, certificate-transparency-style append-only log, or git commit). Hospital audit teams verify chain against external root of trust.

### 4. Verification

`agentskit-os audit verify [--from <date>] [--to <date>]` — replays chain, recomputes Merkle roots, checks signatures, reports first divergence event. Exit code non-zero on any tamper.

### 5. Append-only enforcement

- File mode `0400` after batch close, with O_APPEND for next batch file.
- Sqlite: separate DB file with `PRAGMA journal_mode=WAL` + filesystem-level immutable flag (`chflags uchg` mac, `chattr +a` linux) when supported.
- Cloud sync replicates batches but never deletes. Tombstones tracked separately.

### 6. Redaction-safe

Audit batches store **event hashes**, not bodies. Bodies live in events store with PII redaction (ADR-0007 §4) already applied. Tamper of redacted body still detectable via hash mismatch. GDPR right-to-erasure: erase body, keep hash + null-payload marker. Chain integrity preserved.

### 7. Schema location

`packages/os-core/src/audit/`. Exports `AuditBatch`, `SignedEventRef`, `AnchorRecord`, verifier helpers (host-impl, declared as interface in core).

## Consequences

- One contract for SOC2 / HIPAA / GDPR / FedRAMP exporters at M6.
- Plugin authors who emit audit events get correct shape automatically.
- Performance: SHA-256 + ed25519 sign = µs per event, ms per batch — negligible.
- Storage: ~500 bytes per batch + N event hashes. <1 GB/year for 1M events/day.
- Adds rotation + anchor mgmt complexity — accepted; gated behind `local` default.

## Alternatives Considered

- **Single signing key, no chain.** Rejected. Detects forged event but not deletion.
- **Blockchain.** Rejected. Cost + latency + ops burden + privacy.
- **External SaaS only (Datadog audit).** Rejected. Violates self-host-day-1.
- **WORM storage only.** Rejected. Doesn't survive disk swap; cryptographic chain does.

## Open Questions (RFC follow-ups)

- Default anchor cadence (per-batch / hourly / daily).
- Multi-region replication conflict — divergent chains converging via HLC?
- User-friendly verification UI — desktop "audit health" badge.
