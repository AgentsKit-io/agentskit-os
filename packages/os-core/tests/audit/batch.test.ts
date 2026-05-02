import { describe, expect, it } from 'vitest'
import {
  AUDIT_SCHEMA_VERSION,
  AuditBatch,
  GENESIS_PREV_HASH,
  computeBatchDigest,
  computeMerkleRoot,
  parseAuditBatch,
  safeParseAuditBatch,
  verifyChain,
} from '../../src/audit/batch.js'

const ULID = '01HXYZTPGGJTZ3WBPJN3XKXQ7N'
const ULID_2 = '01HXYZTPGGJTZ3WBPJN3XKXQ7P'
const ULID_3 = '01HXYZTPGGJTZ3WBPJN3XKXQ7Q'

const eventRefs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    eventId: ULID.slice(0, -2) + (10 + i).toString(16).padStart(2, '0').toUpperCase(),
    eventHash: i.toString(16).padStart(64, '0'),
  }))

const buildBatch = async (over: {
  batchId: string
  prev: string
  events: { eventId: string; eventHash: string }[]
}) => {
  const merkleRoot = await computeMerkleRoot(over.events.map((e) => e.eventHash))
  const startedAt = '2026-05-01T17:00:00.000Z'
  const endedAt = '2026-05-01T17:01:00.000Z'
  const signedDigest = await computeBatchDigest({
    merkleRoot,
    prevBatchHash: over.prev,
    batchId: over.batchId,
    workspaceId: 'team-a',
    startedAt,
    endedAt,
  })
  return parseAuditBatch({
    schemaVersion: AUDIT_SCHEMA_VERSION,
    batchId: over.batchId,
    workspaceId: 'team-a',
    startedAt,
    endedAt,
    prevBatchHash: over.prev,
    events: over.events,
    merkleRoot,
    signedDigest,
    signature: {
      algorithm: 'ed25519',
      publicKey: 'A'.repeat(64),
      signature: 'B'.repeat(64),
    },
  })
}

describe('computeMerkleRoot', () => {
  it('returns sha256("") for empty', async () => {
    const root = await computeMerkleRoot([])
    expect(root).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns single hash for single event', async () => {
    const h = '0'.repeat(64)
    expect(await computeMerkleRoot([h])).toBe(h)
  })

  it('handles odd count by duplicating last', async () => {
    const r1 = await computeMerkleRoot(['1'.padStart(64, '0'), '2'.padStart(64, '0'), '3'.padStart(64, '0')])
    const r2 = await computeMerkleRoot(['1'.padStart(64, '0'), '2'.padStart(64, '0'), '3'.padStart(64, '0'), '3'.padStart(64, '0')])
    expect(r1).toBe(r2)
  })

  it('different inputs yield different roots', async () => {
    const a = await computeMerkleRoot(['1'.padStart(64, '0')])
    const b = await computeMerkleRoot(['2'.padStart(64, '0')])
    expect(a).not.toBe(b)
  })
})

describe('AuditBatch schema', () => {
  it('parses well-formed batch', async () => {
    const b = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(3) })
    expect(b.schemaVersion).toBe(1)
    expect(b.events).toHaveLength(3)
  })

  it('rejects non-hex prevBatchHash', async () => {
    const valid = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const broken = { ...valid, prevBatchHash: 'XYZ' }
    expect(safeParseAuditBatch(broken).success).toBe(false)
  })

  it('rejects empty events array', async () => {
    const valid = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    expect(safeParseAuditBatch({ ...valid, events: [] }).success).toBe(false)
  })

  it('rejects unsupported schemaVersion', async () => {
    const valid = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    expect(safeParseAuditBatch({ ...valid, schemaVersion: 99 }).success).toBe(false)
  })
})

describe('verifyChain', () => {
  it('accepts valid 3-batch chain', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const b2 = await buildBatch({ batchId: ULID_2, prev: b1.signedDigest, events: eventRefs(2) })
    const b3 = await buildBatch({ batchId: ULID_3, prev: b2.signedDigest, events: eventRefs(1) })
    const r = await verifyChain([b1, b2, b3])
    expect(r.ok).toBe(true)
  })

  it('detects genesis violation', async () => {
    const b1 = await buildBatch({
      batchId: ULID,
      prev: '1'.padStart(64, '0'),
      events: eventRefs(2),
    })
    const r = await verifyChain([b1])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.break.code).toBe('genesis_invalid')
  })

  it('detects prev_hash mismatch', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const b2 = await buildBatch({ batchId: ULID_2, prev: '0'.repeat(63) + '1', events: eventRefs(1) })
    const r = await verifyChain([b1, b2])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.break.code).toBe('prev_hash_mismatch')
  })

  it('detects merkle_root mismatch', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const tampered = { ...b1, merkleRoot: '0'.repeat(64) }
    const r = await verifyChain([tampered])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.break.code).toBe('merkle_root_mismatch')
  })

  it('detects digest mismatch', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const tampered = { ...b1, signedDigest: '0'.repeat(64) }
    const r = await verifyChain([tampered])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.break.code).toBe('digest_mismatch')
  })

  it('reports signature failure via verifier', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(2) })
    const r = await verifyChain([b1], async () => false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.break.code).toBe('signature_invalid')
  })

  it('default signature verifier returns true', async () => {
    const b1 = await buildBatch({ batchId: ULID, prev: GENESIS_PREV_HASH, events: eventRefs(1) })
    const r = await verifyChain([b1])
    expect(r.ok).toBe(true)
  })

  it('empty chain is trivially valid', async () => {
    const r = await verifyChain([])
    expect(r.ok).toBe(true)
  })
})
