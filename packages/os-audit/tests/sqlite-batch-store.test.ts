import { describe, expect, it } from 'vitest'
import { GENESIS_PREV_HASH, verifyChain } from '@agentskit/os-core'
import { AuditEmitter, SqliteBatchStore } from '../src/index.js'
import { fakeDb } from './_fake-sqlite.js'
import { fakeEvent, fakeSigner, nextBatchId } from './_helpers.js'

const buildEmitter = (store: SqliteBatchStore) =>
  new AuditEmitter({
    store,
    signer: fakeSigner(),
    newBatchId: nextBatchId,
    maxEventsPerBatch: 1,
    maxIntervalMs: 60_000,
  })

describe('SqliteBatchStore', () => {
  it('latestDigest returns genesis when empty', async () => {
    const s = new SqliteBatchStore({ db: fakeDb() })
    expect(await s.latestDigest('team-a')).toBe(GENESIS_PREV_HASH)
  })

  it('appends a batch via emitter ingestion', async () => {
    const db = fakeDb()
    const s = new SqliteBatchStore({ db })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    expect(db.rows.length).toBe(1)
    expect(db.rows[0]!.workspace_id).toBe('team-a')
  })

  it('chains multiple batches and verifyChain returns ok', async () => {
    const s = new SqliteBatchStore({ db: fakeDb() })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    await e.ingest(fakeEvent())
    await e.ingest(fakeEvent())
    const batches = await s.load('team-a')
    expect(batches.length).toBe(3)
    const r = await verifyChain(batches)
    expect(r.ok).toBe(true)
  })

  it('rejects out-of-chain prevBatchHash', async () => {
    const s = new SqliteBatchStore({ db: fakeDb() })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    const original = await s.load('team-a')
    await expect(
      s.append({ ...original[0]!, prevBatchHash: 'sha512:bad' }),
    ).rejects.toThrow('chain break')
  })

  it('isolates workspaces', async () => {
    const s = new SqliteBatchStore({ db: fakeDb() })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent({ workspaceId: 'a' }))
    await e.ingest(fakeEvent({ workspaceId: 'b' }))
    expect((await s.load('a')).length).toBe(1)
    expect((await s.load('b')).length).toBe(1)
    expect(await s.listWorkspaces()).toEqual(['a', 'b'])
  })

  it('latestDigest matches last appended signedDigest', async () => {
    const s = new SqliteBatchStore({ db: fakeDb() })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    await e.ingest(fakeEvent())
    const batches = await s.load('team-a')
    expect(await s.latestDigest('team-a')).toBe(batches[1]!.signedDigest)
  })

  it('skips corrupt batch_json silently on load', async () => {
    const db = fakeDb()
    const s = new SqliteBatchStore({ db })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    await e.ingest(fakeEvent())
    db.rows[0]!.batch_json = '{not valid'
    const out = await s.load('team-a')
    expect(out.length).toBe(1)
  })

  it('honors custom table name', async () => {
    const s = new SqliteBatchStore({ db: fakeDb(), table: 'my_audit' })
    const e = buildEmitter(s)
    await e.ingest(fakeEvent())
    expect((await s.load('team-a')).length).toBe(1)
  })

  it('rejects table names that could permit injection', () => {
    expect(() => new SqliteBatchStore({ db: fakeDb(), table: 'a; DROP TABLE x' }))
      .toThrow('invalid table name')
    expect(() => new SqliteBatchStore({ db: fakeDb(), table: '' }))
      .toThrow('invalid table name')
    expect(() => new SqliteBatchStore({ db: fakeDb(), table: '1bad' }))
      .toThrow('invalid table name')
  })
})
