import { describe, expect, it } from 'vitest'
import {
  createActivityLedger,
  createSignalChannel,
  runActivity,
} from '../src/temporal-style.js'

describe('runActivity (#63)', () => {
  it('runs once and replays the recorded result', async () => {
    let calls = 0
    const ledger = createActivityLedger()
    const first = await runActivity(ledger, 'fetch-user', async () => {
      calls += 1
      return 'rebeca'
    })
    expect(first.kind).toBe('completed')
    if (first.kind === 'completed') expect(first.value).toBe('rebeca')
    const second = await runActivity(ledger, 'fetch-user', async () => {
      calls += 1
      return 'should-not-run'
    })
    expect(calls).toBe(1)
    if (second.kind === 'completed') expect(second.value).toBe('rebeca')
  })

  it('records failure once and replays it', async () => {
    const ledger = createActivityLedger()
    await runActivity(ledger, 'flaky', async () => {
      throw new Error('boom')
    })
    const replay = await runActivity(ledger, 'flaky', async () => 'x')
    expect(replay.kind).toBe('failed')
  })

  it('snapshot round-trips through createActivityLedger', async () => {
    const a = createActivityLedger()
    await runActivity(a, 'k', async () => 1)
    const b = createActivityLedger(a.snapshot())
    expect(b.hasCompleted('k')).toBe(true)
  })
})

describe('SignalChannel (#63)', () => {
  it('drains pending signals and clears the buffer', () => {
    const ch = createSignalChannel<string>()
    ch.send('a')
    ch.send('b')
    expect(ch.peek()).toEqual(['a', 'b'])
    expect(ch.drain()).toEqual(['a', 'b'])
    expect(ch.peek()).toEqual([])
  })
})
