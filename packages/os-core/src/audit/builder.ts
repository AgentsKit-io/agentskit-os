// Per #106 — signed audit log batch builder.
// Assembles a fully signed AuditBatch from raw events, given a signer hook.
// Pure-ish: caller supplies clock, batchId factory, signer; we drive the
// hash chain + Merkle root + digest deterministically.

import {
  AuditBatch,
  AUDIT_SCHEMA_VERSION,
  GENESIS_PREV_HASH,
  computeBatchDigest,
  computeMerkleRoot,
  type AuditSignature,
  type SignedEventRef,
} from './batch.js'

export type AuditBatchBuilderInput = {
  readonly batchId: string
  readonly workspaceId: string
  readonly events: readonly SignedEventRef[]
  /** Hash of the previous batch's signedDigest; supply `GENESIS_PREV_HASH` for the first batch. */
  readonly prevBatchHash?: string
  readonly startedAt: string
  readonly endedAt: string
}

export type AuditSigner = (digestHex: string) => Promise<AuditSignature>

/**
 * Build a signed AuditBatch (#106). Computes the Merkle root over event
 * hashes, derives the canonical signedDigest, calls the supplied signer,
 * and parses the result through `AuditBatch` so consumers always receive a
 * schema-valid object.
 */
export const buildSignedAuditBatch = async (
  input: AuditBatchBuilderInput,
  signer: AuditSigner,
): Promise<AuditBatch> => {
  if (input.events.length === 0) {
    throw new Error('audit-builder: events[] must be non-empty')
  }
  const merkleRoot = await computeMerkleRoot(input.events.map((e) => e.eventHash))
  const prev = input.prevBatchHash ?? GENESIS_PREV_HASH
  const signedDigest = await computeBatchDigest({
    merkleRoot,
    prevBatchHash: prev,
    batchId: input.batchId,
    workspaceId: input.workspaceId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
  })
  const signature = await signer(signedDigest)
  return AuditBatch.parse({
    schemaVersion: AUDIT_SCHEMA_VERSION,
    batchId: input.batchId,
    workspaceId: input.workspaceId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    prevBatchHash: prev,
    events: [...input.events],
    merkleRoot,
    signedDigest,
    signature,
  })
}

/** Convenience: derive the next batch's `prevBatchHash` from the current. */
export const nextPrevBatchHash = (current: AuditBatch): string => current.signedDigest

/**
 * Build a stub signer that returns deterministic ed25519-shaped placeholder
 * material. Useful for tests and for environments that anchor signatures
 * out-of-band; not a real signer.
 */
export const createNullAuditSigner = (publicKey: string): AuditSigner =>
  async (digestHex) => ({
    algorithm: 'ed25519',
    publicKey,
    signature: digestHex.repeat(2),
  })
