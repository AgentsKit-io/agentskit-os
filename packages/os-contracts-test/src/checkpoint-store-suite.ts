// Golden contract suite for CheckpointStore impls. Run with vitest's
// describe/it injected by the caller — keeps this package free of
// vitest globals so it can be invoked from any vitest-based test file.

import type { CheckpointRecord, CheckpointStore } from '@agentskit/os-flow'

export type SuiteHooks = {
  readonly describe: (name: string, body: () => void) => void
  readonly it: (name: string, body: () => Promise<void> | void) => void
  readonly beforeEach: (body: () => Promise<void> | void) => void
  readonly expect: (value: unknown) => {
    toBe(other: unknown): void
    toEqual(other: unknown): void
    toHaveLength(n: number): void
    not: { toEqual(other: unknown): void }
    rejects: { toThrow(msg?: string | RegExp): Promise<void> }
    resolves: { toBeUndefined(): Promise<void> }
  }
}

export type CheckpointStoreFactory = () => Promise<CheckpointStore> | CheckpointStore

const rec = (
  runId: string,
  nodeId: string,
  value: unknown = 'ok',
  recordedAt = '2026-05-02T00:00:00.000Z',
): CheckpointRecord => ({
  runId,
  nodeId,
  outcome: { kind: 'ok', value },
  recordedAt,
})

export const runCheckpointStoreSuite = (
  hooks: SuiteHooks,
  label: string,
  factory: CheckpointStoreFactory,
): void => {
  const { describe, it, beforeEach, expect } = hooks

  describe(`CheckpointStore contract: ${label}`, () => {
    let store: CheckpointStore
    beforeEach(async () => { store = await factory() })

    it('append + load preserves seq order', async () => {
      await store.append(rec('r1', 'a'))
      await store.append(rec('r1', 'b'))
      await store.append(rec('r1', 'c'))
      const out = await store.load('r1')
      expect(out.map((r) => r.nodeId)).toEqual(['a', 'b', 'c'])
    })

    it('returns empty array for unknown runId', async () => {
      expect(await store.load('nope')).toEqual([])
    })

    it('isolates runs', async () => {
      await store.append(rec('a', 'n'))
      await store.append(rec('b', 'n'))
      expect((await store.load('a')).length).toBe(1)
      expect((await store.load('b')).length).toBe(1)
    })

    it('preserves all record fields round-trip', async () => {
      const r = rec('r1', 'a', { score: 5, label: 'good' }, '2026-05-02T01:00:00.000Z')
      await store.append(r)
      const out = await store.load('r1')
      expect(out[0]).toEqual(r)
    })

    it('clear removes only target run', async () => {
      await store.append(rec('a', 'n'))
      await store.append(rec('b', 'n'))
      await store.clear('a')
      expect(await store.load('a')).toEqual([])
      expect((await store.load('b')).length).toBe(1)
    })

    it('many appends keep order monotonic', async () => {
      for (let i = 0; i < 50; i++) await store.append(rec('r', `n${i}`))
      const out = await store.load('r')
      expect(out.length).toBe(50)
      expect(out[0]?.nodeId).toBe('n0')
      expect(out[49]?.nodeId).toBe('n49')
    })
  })
}
