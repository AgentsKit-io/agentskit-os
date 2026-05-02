// Audit batch chain per ADR-0008. Pure schema + verifier helpers.
// Crypto via Web Crypto API (Node ≥20 + browsers). Signature verification
// pluggable via Verifier interface; structural chain integrity always
// computed in-core.

import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'
import { Ulid } from '../events/event.js'

export const AUDIT_SCHEMA_VERSION = 1 as const
export const GENESIS_PREV_HASH: string = '0'.repeat(64)

const Hex64 = z
  .string()
  .length(64)
  .regex(/^[0-9a-f]{64}$/, { message: 'must be 64-char lowercase hex (SHA-256)' })

export const SignedEventRef = z.object({
  eventId: Ulid,
  eventHash: Hex64,
})
export type SignedEventRef = z.infer<typeof SignedEventRef>

export const AuditSignature = z.object({
  algorithm: z.literal('ed25519'),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})
export type AuditSignature = z.infer<typeof AuditSignature>

export const AuditKeyCustody = z.enum(['local', 'hsm', 'external'])
export type AuditKeyCustody = z.infer<typeof AuditKeyCustody>

export const AuditBatch = z.object({
  schemaVersion: z.literal(AUDIT_SCHEMA_VERSION),
  batchId: Ulid,
  workspaceId: Slug,
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  prevBatchHash: Hex64,
  events: z.array(SignedEventRef).min(1).max(100_000),
  merkleRoot: Hex64,
  signedDigest: Hex64,
  signature: AuditSignature,
})
export type AuditBatch = z.infer<typeof AuditBatch>

export const AnchorRecord = z.object({
  batchId: Ulid,
  signedDigest: Hex64,
  anchoredAt: z.string().datetime({ offset: true }),
  anchor: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('rekor'), uuid: z.string().min(1).max(256) }),
    z.object({ kind: z.literal('git'), commitSha: z.string().regex(/^[0-9a-f]{40}$/) }),
    z.object({ kind: z.literal('custom'), uri: z.string().url() }),
  ]),
})
export type AnchorRecord = z.infer<typeof AnchorRecord>

export const parseAuditBatch = (input: unknown): AuditBatch => AuditBatch.parse(input)
export const safeParseAuditBatch = (input: unknown) => AuditBatch.safeParse(input)

const toHex = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0')
  }
  return out
}

const sha256 = async (data: string | Uint8Array): Promise<string> => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const buf = await crypto.subtle.digest('SHA-256', ab as ArrayBuffer)
  return toHex(new Uint8Array(buf))
}

export const computeMerkleRoot = async (eventHashes: readonly string[]): Promise<string> => {
  if (eventHashes.length === 0) {
    return await sha256('')
  }
  let layer = [...eventHashes]
  while (layer.length > 1) {
    const next: string[] = []
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i]!
      const b = layer[i + 1] ?? a // duplicate last when odd
      next.push(await sha256(a + b))
    }
    layer = next
  }
  return layer[0]!
}

export const computeBatchDigest = async (batch: {
  merkleRoot: string
  prevBatchHash: string
  batchId: string
  workspaceId: string
  startedAt: string
  endedAt: string
}): Promise<string> => {
  const canonical = [
    batch.merkleRoot,
    batch.prevBatchHash,
    batch.batchId,
    batch.workspaceId,
    batch.startedAt,
    batch.endedAt,
  ].join('|')
  return sha256(canonical)
}

export type ChainBreak = {
  readonly index: number
  readonly batchId: string
  readonly code:
    | 'prev_hash_mismatch'
    | 'merkle_root_mismatch'
    | 'digest_mismatch'
    | 'signature_invalid'
    | 'genesis_invalid'
  readonly message: string
}

export type SignatureVerifier = (batch: AuditBatch) => Promise<boolean>

const trueVerifier: SignatureVerifier = async () => true

export const verifyChain = async (
  batches: readonly AuditBatch[],
  verifySignature: SignatureVerifier = trueVerifier,
): Promise<{ ok: true } | { ok: false; break: ChainBreak }> => {
  let prev: string = GENESIS_PREV_HASH
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i]!
    if (i === 0 && b.prevBatchHash !== GENESIS_PREV_HASH) {
      return {
        ok: false,
        break: {
          index: i,
          batchId: b.batchId,
          code: 'genesis_invalid',
          message: 'first batch must reference genesis prevBatchHash (64 zeros)',
        },
      }
    }
    if (b.prevBatchHash !== prev) {
      return {
        ok: false,
        break: {
          index: i,
          batchId: b.batchId,
          code: 'prev_hash_mismatch',
          message: `batch ${b.batchId}: expected prev ${prev}, got ${b.prevBatchHash}`,
        },
      }
    }

    const recomputedRoot = await computeMerkleRoot(b.events.map((e) => e.eventHash))
    if (recomputedRoot !== b.merkleRoot) {
      return {
        ok: false,
        break: {
          index: i,
          batchId: b.batchId,
          code: 'merkle_root_mismatch',
          message: `batch ${b.batchId}: expected merkleRoot ${recomputedRoot}, got ${b.merkleRoot}`,
        },
      }
    }

    const recomputedDigest = await computeBatchDigest(b)
    if (recomputedDigest !== b.signedDigest) {
      return {
        ok: false,
        break: {
          index: i,
          batchId: b.batchId,
          code: 'digest_mismatch',
          message: `batch ${b.batchId}: signedDigest does not match recomputed`,
        },
      }
    }

    if (!(await verifySignature(b))) {
      return {
        ok: false,
        break: {
          index: i,
          batchId: b.batchId,
          code: 'signature_invalid',
          message: `batch ${b.batchId}: signature verification failed`,
        },
      }
    }

    prev = b.signedDigest
  }
  return { ok: true }
}
