import { describe, expect, it } from 'vitest'
import { GENESIS_PREV_HASH, type AuditBatch } from '@agentskit/os-core'
import { InMemoryBatchStore } from '../src/batch-store.js'

const mkBatch = (
  workspaceId: string,
  prevBatchHash: string,
  signedDigest: string,
  batchId: string,
): AuditBatch =>
  ({
    schemaVersion: 1,
    batchId,
    workspaceId,
    startedAt: '2026-05-02T00:00:00.000Z',
    endedAt: '2026-05-02T00:01:00.000Z',
    prevBatchHash,
    events: [{ eventId: '01HXYZTPGGJTZ3WBPJN3XKXQ7N', eventHash: 'a'.repeat(64) }],
    merkleRoot: 'a'.repeat(64),
    signedDigest,
    signature: { algorithm: 'ed25519', publicKey: 'A'.repeat(64), signature: 'B'.repeat(64) },
  }) as AuditBatch

describe('InMemoryBatchStore', () => {
  it('latestDigest is genesis when empty', async () => {
    const s = new InMemoryBatchStore()
    expect(await s.latestDigest('w')).toBe(GENESIS_PREV_HASH)
  })

  it('appends batch and returns its digest', async () => {
    const s = new InMemoryBatchStore()
    const b = mkBatch('w', GENESIS_PREV_HASH, '1'.repeat(64), '01HBATCH1ZTPGGJTZ3WBPJN3XQ')
    await s.append(b)
    expect(await s.latestDigest('w')).toBe('1'.repeat(64))
  })

  it('rejects out-of-chain prevBatchHash', async () => {
    const s = new InMemoryBatchStore()
    const bad = mkBatch('w', '9'.repeat(64), '1'.repeat(64), '01HBATCH1ZTPGGJTZ3WBPJN3XQ')
    await expect(s.append(bad)).rejects.toThrow(/chain break/)
  })

  it('chains multiple batches', async () => {
    const s = new InMemoryBatchStore()
    const b1 = mkBatch('w', GENESIS_PREV_HASH, '1'.repeat(64), '01HBATCH1ZTPGGJTZ3WBPJN3XQ')
    const b2 = mkBatch('w', '1'.repeat(64), '2'.repeat(64), '01HBATCH2ZTPGGJTZ3WBPJN3XQ')
    await s.append(b1)
    await s.append(b2)
    const all = await s.load('w')
    expect(all).toHaveLength(2)
  })

  it('isolates workspaces', async () => {
    const s = new InMemoryBatchStore()
    const a = mkBatch('w-a', GENESIS_PREV_HASH, '1'.repeat(64), '01HBATCH1ZTPGGJTZ3WBPJN3XQ')
    const b = mkBatch('w-b', GENESIS_PREV_HASH, '2'.repeat(64), '01HBATCH2ZTPGGJTZ3WBPJN3XQ')
    await s.append(a)
    await s.append(b)
    expect((await s.load('w-a')).length).toBe(1)
    expect((await s.load('w-b')).length).toBe(1)
  })

  it('listWorkspaces returns ids', async () => {
    const s = new InMemoryBatchStore()
    const b = mkBatch('w-a', GENESIS_PREV_HASH, '1'.repeat(64), '01HBATCH1ZTPGGJTZ3WBPJN3XQ')
    await s.append(b)
    expect(await s.listWorkspaces()).toEqual(['w-a'])
  })
})
