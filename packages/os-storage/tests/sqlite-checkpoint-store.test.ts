import { describe, expect, it } from 'vitest'
import type { CheckpointRecord } from '@agentskit/os-flow'
import { SqliteCheckpointStore } from '../src/index.js'
import { fakeDb } from './_fake-sqlite.js'

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

describe('SqliteCheckpointStore', () => {
  it('appends + loads records in seq order', async () => {
    const db = fakeDb()
    const s = new SqliteCheckpointStore({ db })
    await s.append(rec('r1', 'a'))
    await s.append(rec('r1', 'b'))
    await s.append(rec('r1', 'c'))
    const out = await s.load('r1')
    expect(out.map((r) => r.nodeId)).toEqual(['a', 'b', 'c'])
  })

  it('isolates runs', async () => {
    const db = fakeDb()
    const s = new SqliteCheckpointStore({ db })
    await s.append(rec('a', 'n'))
    await s.append(rec('b', 'n'))
    expect((await s.load('a')).length).toBe(1)
    expect((await s.load('b')).length).toBe(1)
  })

  it('returns empty array for unknown runId', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb() })
    expect(await s.load('nope')).toEqual([])
  })

  it('preserves record fields round-trip', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb() })
    const r = rec('r1', 'a', { score: 5, label: 'good' }, '2026-05-02T01:00:00.000Z')
    await s.append(r)
    const out = await s.load('r1')
    expect(out[0]).toEqual(r)
  })

  it('clear removes only target run', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb() })
    await s.append(rec('a', 'n'))
    await s.append(rec('b', 'n'))
    await s.clear('a')
    expect(await s.load('a')).toEqual([])
    expect((await s.load('b')).length).toBe(1)
  })

  it('listRuns returns distinct sorted run ids', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb() })
    await s.append(rec('z', 'n'))
    await s.append(rec('a', 'n'))
    await s.append(rec('a', 'n2'))
    expect(await s.listRuns()).toEqual(['a', 'z'])
  })

  it('honors custom table name', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb(), table: 'my_checkpoints' })
    await s.append(rec('r1', 'a'))
    expect((await s.load('r1')).length).toBe(1)
  })

  it('rejects table names that could permit injection', () => {
    expect(() => new SqliteCheckpointStore({ db: fakeDb(), table: 'a; DROP TABLE x' }))
      .toThrow('invalid table name')
    expect(() => new SqliteCheckpointStore({ db: fakeDb(), table: '' }))
      .toThrow('invalid table name')
    expect(() => new SqliteCheckpointStore({ db: fakeDb(), table: '1bad' }))
      .toThrow('invalid table name')
  })

  it('skips corrupt rows silently', async () => {
    const db = fakeDb()
    const s = new SqliteCheckpointStore({ db })
    await s.append(rec('r1', 'a'))
    db.rows[0]!.outcome_json = '{not valid'
    await s.append(rec('r1', 'b'))
    const out = await s.load('r1')
    expect(out.map((r) => r.nodeId)).toEqual(['b'])
  })

  it('survives many appends keeping seq monotonic', async () => {
    const s = new SqliteCheckpointStore({ db: fakeDb() })
    for (let i = 0; i < 100; i++) await s.append(rec('r', `n${i}`))
    const out = await s.load('r')
    expect(out.length).toBe(100)
    expect(out[0]!.nodeId).toBe('n0')
    expect(out[99]!.nodeId).toBe('n99')
  })
})
