import { describe, expect, it } from 'vitest'
import {
  GENESIS_PREV_HASH,
  buildSignedAuditBatch,
  createNullAuditSigner,
  nextPrevBatchHash,
  verifyChain,
} from '../../src/index.js'

const T0 = '2026-05-06T12:00:00.000Z'
const T1 = '2026-05-06T12:05:00.000Z'
const T2 = '2026-05-06T12:10:00.000Z'

const event = (id: string, hash: string) => ({ eventId: id, eventHash: hash })
const HEX_64 = (seed: string) => seed.repeat(64).slice(0, 64)

const ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const ULID2 = '01ARZ3NDEKTSV4RRFFQ69G5FAW'

const signer = createNullAuditSigner(`pk-${'a'.repeat(80)}`)

describe('buildSignedAuditBatch (#106)', () => {
  it('produces a schema-valid batch with computed merkle root + signature', async () => {
    const batch = await buildSignedAuditBatch(
      {
        batchId: ULID,
        workspaceId: 'ws-1',
        startedAt: T0,
        endedAt: T1,
        events: [event(ULID, HEX_64('a')), event(ULID2, HEX_64('b'))],
      },
      signer,
    )
    expect(batch.prevBatchHash).toBe(GENESIS_PREV_HASH)
    expect(batch.merkleRoot).toMatch(/^[0-9a-f]{64}$/)
    expect(batch.signedDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(batch.signature.algorithm).toBe('ed25519')
  })

  it('refuses to build an empty batch', async () => {
    await expect(
      buildSignedAuditBatch(
        {
          batchId: ULID,
          workspaceId: 'ws-1',
          startedAt: T0,
          endedAt: T1,
          events: [],
        },
        signer,
      ),
    ).rejects.toThrow(/non-empty/)
  })

  it('chains: nextPrevBatchHash links batch N+1 back to N and verifyChain accepts', async () => {
    const a = await buildSignedAuditBatch(
      {
        batchId: ULID,
        workspaceId: 'ws-1',
        startedAt: T0,
        endedAt: T1,
        events: [event(ULID, HEX_64('a'))],
      },
      signer,
    )
    const b = await buildSignedAuditBatch(
      {
        batchId: ULID2,
        workspaceId: 'ws-1',
        startedAt: T1,
        endedAt: T2,
        prevBatchHash: nextPrevBatchHash(a),
        events: [event(ULID2, HEX_64('c'))],
      },
      signer,
    )
    expect(b.prevBatchHash).toBe(a.signedDigest)
    const verdict = await verifyChain([a, b])
    expect(verdict.ok).toBe(true)
  })
})
