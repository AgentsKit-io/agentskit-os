import { describe, expect, it } from 'vitest'
import { verifyChain } from '@agentskit/os-core'
import { AuditEmitter } from '../src/emitter.js'
import { InMemoryBatchStore } from '../src/batch-store.js'
import { fakeEvent, fakeSigner, nextBatchId } from './_helpers.js'

const newEmitter = (overrides?: Partial<Parameters<typeof buildOpts>[0]>) => {
  const store = new InMemoryBatchStore()
  return {
    store,
    emitter: new AuditEmitter(buildOpts({ store, ...overrides })),
  }
}

const buildOpts = (cfg: { store: InMemoryBatchStore; maxEventsPerBatch?: number }) => ({
  store: cfg.store,
  signer: fakeSigner(),
  newBatchId: nextBatchId,
  maxEventsPerBatch: cfg.maxEventsPerBatch ?? 1000,
  maxIntervalMs: 60_000,
})

describe('AuditEmitter', () => {
  it('buffers events and produces batch on flush', async () => {
    const { emitter, store } = newEmitter()
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    expect(emitter.pending('team-a')).toBe(2)
    const batch = await emitter.flush('team-a')
    expect(batch).toBeDefined()
    expect(batch?.events).toHaveLength(2)
    expect((await store.load('team-a')).length).toBe(1)
  })

  it('auto-flushes when reaching maxEventsPerBatch', async () => {
    const { emitter, store } = newEmitter({ maxEventsPerBatch: 2 })
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    expect((await store.load('team-a')).length).toBe(1)
    expect(emitter.pending('team-a')).toBe(0)
  })

  it('chains successive batches via prevBatchHash', async () => {
    const { emitter, store } = newEmitter({ maxEventsPerBatch: 1 })
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    await emitter.ingest(fakeEvent())
    const batches = await store.load('team-a')
    expect(batches).toHaveLength(3)
    const result = await verifyChain(batches)
    expect(result.ok).toBe(true)
  })

  it('produces verifiable single batch', async () => {
    const { emitter, store } = newEmitter()
    await emitter.ingest(fakeEvent())
    await emitter.flush('team-a')
    const result = await verifyChain(await store.load('team-a'))
    expect(result.ok).toBe(true)
  })

  it('isolates workspaces', async () => {
    const { emitter, store } = newEmitter()
    await emitter.ingest(fakeEvent({ workspaceId: 'team-a' as any }))
    await emitter.ingest(fakeEvent({ workspaceId: 'team-b' as any }))
    expect(emitter.pending('team-a')).toBe(1)
    expect(emitter.pending('team-b')).toBe(1)
    await emitter.flush('team-a')
    expect((await store.load('team-a')).length).toBe(1)
    expect((await store.load('team-b')).length).toBe(0)
  })

  it('flushAll emits one batch per workspace', async () => {
    const { emitter, store } = newEmitter()
    await emitter.ingest(fakeEvent({ workspaceId: 'team-a' as any }))
    await emitter.ingest(fakeEvent({ workspaceId: 'team-b' as any }))
    const out = await emitter.flushAll()
    expect(out).toHaveLength(2)
    expect((await store.load('team-a')).length).toBe(1)
    expect((await store.load('team-b')).length).toBe(1)
  })

  it('flush on empty buffer is no-op', async () => {
    const { emitter } = newEmitter()
    expect(await emitter.flush('team-a')).toBeUndefined()
  })

  it('close flushes pending events then refuses ingests', async () => {
    const { emitter, store } = newEmitter()
    await emitter.ingest(fakeEvent())
    await emitter.close()
    expect((await store.load('team-a')).length).toBe(1)
    await expect(emitter.ingest(fakeEvent())).rejects.toThrow(/closed/)
  })
})
