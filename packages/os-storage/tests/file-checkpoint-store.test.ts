import { describe, expect, it } from 'vitest'
import { FileCheckpointStore, safeRunId } from '../src/index.js'
import { fakeFs } from './_fake-fs.js'

const rec = (runId: string, nodeId: string, ok = true) => ({
  runId,
  nodeId,
  outcome: ok
    ? ({ kind: 'ok', value: nodeId } as const)
    : ({ kind: 'failed', error: { code: 'x', message: 'y' } } as const),
  recordedAt: '2026-05-02T00:00:00.000Z',
})

describe('safeRunId', () => {
  it('preserves alphanum, dot, dash, underscore', () => {
    expect(safeRunId('run_1.2-foo')).toBe('run_1.2-foo')
  })

  it('replaces unsafe chars', () => {
    expect(safeRunId('run/1 2:3')).toBe('run_1_2_3')
  })
})

describe('FileCheckpointStore', () => {
  it('appends + loads via fake fs', async () => {
    const fs = fakeFs()
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    await store.append(rec('r1', 'a'))
    await store.append(rec('r1', 'b'))
    const records = await store.load('r1')
    expect(records.map((r) => r.nodeId)).toEqual(['a', 'b'])
    expect(fs.files.has('/var/runs/r1.jsonl')).toBe(true)
  })

  it('isolates runs to per-run files', async () => {
    const fs = fakeFs()
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    await store.append(rec('r1', 'a'))
    await store.append(rec('r2', 'a'))
    expect(fs.files.has('/var/runs/r1.jsonl')).toBe(true)
    expect(fs.files.has('/var/runs/r2.jsonl')).toBe(true)
    expect((await store.load('r1')).length).toBe(1)
    expect((await store.load('r2')).length).toBe(1)
  })

  it('returns empty for unknown run', async () => {
    const store = new FileCheckpointStore({ dir: '/var/runs', fs: fakeFs() })
    expect(await store.load('ghost')).toEqual([])
  })

  it('clear removes file', async () => {
    const fs = fakeFs()
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    await store.append(rec('r1', 'a'))
    await store.clear('r1')
    expect(fs.files.has('/var/runs/r1.jsonl')).toBe(false)
    expect(await store.load('r1')).toEqual([])
  })

  it('clear is idempotent on missing file', async () => {
    const store = new FileCheckpointStore({ dir: '/var/runs', fs: fakeFs() })
    await expect(store.clear('ghost')).resolves.toBeUndefined()
  })

  it('listRuns returns ids of jsonl files', async () => {
    const fs = fakeFs()
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    await store.append(rec('r1', 'a'))
    await store.append(rec('r2', 'a'))
    const runs = await store.listRuns()
    expect(runs.sort()).toEqual(['r1', 'r2'])
  })

  it('listRuns returns empty when dir does not exist', async () => {
    const store = new FileCheckpointStore({ dir: '/empty', fs: fakeFs() })
    expect(await store.listRuns()).toEqual([])
  })

  it('skips corrupt JSONL lines silently', async () => {
    const fs = fakeFs({ '/var/runs/r1.jsonl': '{not json}\n{"runId":"r1","nodeId":"a","outcome":{"kind":"ok","value":1},"recordedAt":"t"}\n' })
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    const records = await store.load('r1')
    expect(records.length).toBe(1)
    expect(records[0]?.nodeId).toBe('a')
  })

  it('sanitizes runId for filename', async () => {
    const fs = fakeFs()
    const store = new FileCheckpointStore({ dir: '/var/runs', fs })
    await store.append(rec('run/with:slash', 'a'))
    expect(fs.files.has('/var/runs/run_with_slash.jsonl')).toBe(true)
  })
})
