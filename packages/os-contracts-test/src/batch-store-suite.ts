// Golden contract suite for BatchStore impls. Mirrors the AuditEmitter
// + verifyChain integration semantics so any backend (file, sqlite,
// redis, postgres, …) can prove conformance.

import type { AnyEvent } from '@agentskit/os-core'
import { GENESIS_PREV_HASH, verifyChain } from '@agentskit/os-core'
import { AuditEmitter, type BatchStore, type Signer } from '@agentskit/os-audit'
import type { SuiteHooks } from './checkpoint-store-suite.js'

export type BatchStoreFactory = () => Promise<BatchStore> | BatchStore

let idCounter = 0
const ULID_BASE = '01HXYZTPGGJTZ3WBPJN3XKXQ'
const nextUlid = (): string => {
  idCounter = (idCounter + 1) % 36 ** 2
  return `${ULID_BASE}${idCounter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}

let batchCounter = 0
const BATCH_BASE = '01HBATCHTPGGJTZ3WBPJN3XQ'
const nextBatchId = (): string => {
  batchCounter = (batchCounter + 1) % 36 ** 2
  return `${BATCH_BASE}${batchCounter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}

const fakeSigner = (): Signer => ({
  sign: async () => ({
    algorithm: 'ed25519',
    publicKey: 'A'.repeat(64),
    signature: 'B'.repeat(64),
  }),
})

const fakeEvent = (overrides: Partial<AnyEvent> = {}): AnyEvent =>
  ({
    specversion: '1.0',
    id: nextUlid(),
    type: 'agent.task.completed',
    source: 'agentskitos://test',
    time: '2026-05-02T17:00:00.000Z',
    datacontenttype: 'application/json',
    dataschema: 'agentskitos://schema/test/v1',
    data: { ok: true },
    workspaceId: 'team-a',
    principalId: 'usr_1',
    traceId: 'trace_1',
    spanId: 'span_1',
    ...overrides,
  }) as AnyEvent

export const runBatchStoreSuite = (
  hooks: SuiteHooks,
  label: string,
  factory: BatchStoreFactory,
): void => {
  const { describe, it, beforeEach, expect } = hooks

  describe(`BatchStore contract: ${label}`, () => {
    let store: BatchStore
    beforeEach(async () => { store = await factory() })

    const emitter = (s: BatchStore): AuditEmitter =>
      new AuditEmitter({
        store: s,
        signer: fakeSigner(),
        newBatchId: nextBatchId,
        maxEventsPerBatch: 1,
        maxIntervalMs: 60_000,
      })

    it('latestDigest returns genesis when empty', async () => {
      expect(await store.latestDigest('team-a')).toBe(GENESIS_PREV_HASH)
    })

    it('chain of batches verifies clean', async () => {
      const e = emitter(store)
      await e.ingest(fakeEvent())
      await e.ingest(fakeEvent())
      await e.ingest(fakeEvent())
      const batches = await store.load('team-a')
      expect(batches.length).toBe(3)
      const r = await verifyChain(batches)
      expect(r.ok).toBe(true)
    })

    it('rejects out-of-chain prevBatchHash', async () => {
      const e = emitter(store)
      await e.ingest(fakeEvent())
      const batches = await store.load('team-a')
      await expect(
        store.append({ ...batches[0]!, prevBatchHash: 'sha512:bogus' }),
      ).rejects.toThrow(/chain break/)
    })

    it('isolates workspaces', async () => {
      const e = emitter(store)
      await e.ingest(fakeEvent({ workspaceId: 'a' }))
      await e.ingest(fakeEvent({ workspaceId: 'b' }))
      expect((await store.load('a')).length).toBe(1)
      expect((await store.load('b')).length).toBe(1)
    })

    it('latestDigest matches last appended signedDigest', async () => {
      const e = emitter(store)
      await e.ingest(fakeEvent())
      await e.ingest(fakeEvent())
      const batches = await store.load('team-a')
      expect(await store.latestDigest('team-a')).toBe(batches[1]!.signedDigest)
    })
  })
}
