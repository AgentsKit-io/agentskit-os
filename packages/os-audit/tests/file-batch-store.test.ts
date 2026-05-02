import { describe, expect, it } from 'vitest'
import { GENESIS_PREV_HASH, verifyChain } from '@agentskit/os-core'
import { AuditEmitter, FileBatchStore, safeWorkspaceId } from '../src/index.js'
import { fakeFs } from './_fake-fs.js'
import { fakeEvent, fakeSigner, nextBatchId } from './_helpers.js'

describe('safeWorkspaceId', () => {
  it('preserves alphanum, dot, dash, underscore', () => {
    expect(safeWorkspaceId('team_1.foo-bar')).toBe('team_1.foo-bar')
  })
  it('replaces unsafe chars', () => {
    expect(safeWorkspaceId('team/1 2:3')).toBe('team_1_2_3')
  })
})

describe('FileBatchStore', () => {
  it('latestDigest returns genesis when empty', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    expect(await store.latestDigest('team-a')).toBe(GENESIS_PREV_HASH)
  })

  it('appends batch to JSONL file', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const emitter = new AuditEmitter({
      store,
      signer: fakeSigner(),
      newBatchId: nextBatchId,
      maxEventsPerBatch: 1,
      maxIntervalMs: 60_000,
    })
    await emitter.ingest(fakeEvent())
    expect(fs.files.has('/var/audit/team-a.jsonl')).toBe(true)
  })

  it('chains multiple batches with verifyChain', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const emitter = new AuditEmitter({
      store,
      signer: fakeSigner(),
      newBatchId: nextBatchId,
      maxEventsPerBatch: 1,
      maxIntervalMs: 60_000,
    })
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    const batches = await store.load('team-a')
    expect(batches).toHaveLength(3)
    const result = await verifyChain(batches)
    expect(result.ok).toBe(true)
  })

  it('isolates workspaces to separate files', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const emitter = new AuditEmitter({
      store,
      signer: fakeSigner(),
      newBatchId: nextBatchId,
      maxEventsPerBatch: 1,
      maxIntervalMs: 60_000,
    })
    await emitter.ingest(fakeEvent({ workspaceId: 'team-a' as any }))
    await emitter.ingest(fakeEvent({ workspaceId: 'team-b' as any }))
    expect(fs.files.has('/var/audit/team-a.jsonl')).toBe(true)
    expect(fs.files.has('/var/audit/team-b.jsonl')).toBe(true)
  })

  it('listWorkspaces returns ids of jsonl files', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const emitter = new AuditEmitter({
      store,
      signer: fakeSigner(),
      newBatchId: nextBatchId,
      maxEventsPerBatch: 1,
      maxIntervalMs: 60_000,
    })
    await emitter.ingest(fakeEvent({ workspaceId: 'team-a' as any }))
    await emitter.ingest(fakeEvent({ workspaceId: 'team-b' as any }))
    const ws = await store.listWorkspaces()
    expect(ws.sort()).toEqual(['team-a', 'team-b'])
  })

  it('listWorkspaces empty when dir missing', async () => {
    const store = new FileBatchStore({ dir: '/nope', fs: fakeFs() })
    expect(await store.listWorkspaces()).toEqual([])
  })

  it('skips corrupt JSONL lines silently on load', async () => {
    const fs = fakeFs()
    fs.files.set(
      '/var/audit/team-a.jsonl',
      '{not json}\n' +
        JSON.stringify({
          schemaVersion: 1,
          batchId: '01HBATCH1ZTPGGJTZ3WBPJN3XQ',
          workspaceId: 'team-a',
          startedAt: '2026-05-02T00:00:00.000Z',
          endedAt: '2026-05-02T00:01:00.000Z',
          prevBatchHash: '0'.repeat(64),
          events: [{ eventId: '01HXYZTPGGJTZ3WBPJN3XKXQ7N', eventHash: 'a'.repeat(64) }],
          merkleRoot: 'a'.repeat(64),
          signedDigest: 'b'.repeat(64),
          signature: { algorithm: 'ed25519', publicKey: 'A'.repeat(64), signature: 'B'.repeat(64) },
        }) +
        '\n',
    )
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const batches = await store.load('team-a')
    expect(batches).toHaveLength(1)
  })

  it('rejects out-of-chain append', async () => {
    const fs = fakeFs()
    const store = new FileBatchStore({ dir: '/var/audit', fs })
    const bad = {
      schemaVersion: 1 as const,
      batchId: '01HBATCH1ZTPGGJTZ3WBPJN3XQ',
      workspaceId: 'team-a',
      startedAt: '2026-05-02T00:00:00.000Z',
      endedAt: '2026-05-02T00:01:00.000Z',
      prevBatchHash: '9'.repeat(64),
      events: [{ eventId: '01HXYZTPGGJTZ3WBPJN3XKXQ7N', eventHash: 'a'.repeat(64) }],
      merkleRoot: 'a'.repeat(64),
      signedDigest: 'b'.repeat(64),
      signature: {
        algorithm: 'ed25519' as const,
        publicKey: 'A'.repeat(64),
        signature: 'B'.repeat(64),
      },
    }
    await expect(store.append(bad)).rejects.toThrow(/chain break/)
  })
})
