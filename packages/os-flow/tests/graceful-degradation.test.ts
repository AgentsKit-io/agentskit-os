import { describe, expect, it } from 'vitest'
import { runWithGracefulDegradation } from '../src/graceful-degradation.js'

describe('runWithGracefulDegradation (#243)', () => {
  it('returns the primary attempt result when it succeeds', async () => {
    const r = await runWithGracefulDegradation<string>([
      { id: 'primary', run: async () => 'ok' },
      { id: 'fallback', run: async () => 'fb' },
    ])
    expect(r.value).toBe('ok')
    expect(r.winner).toBe('primary')
    expect(r.degraded).toBe(false)
    expect(r.attempts.map((a) => a.status)).toEqual(['ok', 'skipped'])
  })

  it('falls through to the next attempt when the primary throws', async () => {
    const r = await runWithGracefulDegradation<string>([
      { id: 'primary', run: async () => { throw new Error('boom') } },
      { id: 'fallback', run: async () => 'fb' },
    ])
    expect(r.value).toBe('fb')
    expect(r.winner).toBe('fallback')
    expect(r.degraded).toBe(true)
    const primary = r.attempts.find((a) => a.id === 'primary')
    expect(primary?.status).toBe('fail')
  })

  it('returns no value when every enabled attempt fails', async () => {
    const r = await runWithGracefulDegradation<string>([
      { id: 'a', run: async () => { throw new Error('a-fail') } },
      { id: 'b', run: async () => { throw new Error('b-fail') } },
    ])
    expect(r.value).toBeUndefined()
    expect(r.winner).toBeUndefined()
    expect(r.degraded).toBe(false)
  })

  it('skips disabled attempts and treats next enabled one as primary', async () => {
    const r = await runWithGracefulDegradation<string>([
      { id: 'off', enabled: false, run: async () => 'never' },
      { id: 'real-primary', run: async () => 'real' },
      { id: 'fallback', run: async () => 'fb' },
    ])
    expect(r.winner).toBe('real-primary')
    expect(r.degraded).toBe(false)
    const off = r.attempts.find((a) => a.id === 'off')
    expect(off?.status).toBe('skipped')
  })

  it('honours an abort signal across attempts', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const r = await runWithGracefulDegradation<string>(
      [
        { id: 'a', run: async () => 'never' },
        { id: 'b', run: async () => 'never' },
      ],
      { signal: ctrl.signal },
    )
    expect(r.value).toBeUndefined()
    expect(r.attempts.every((a) => a.status === 'skipped')).toBe(true)
  })
})
