import { describe, expect, it } from 'vitest'
import { cronPreview, parseCron } from '../cron-preview'

describe('parseCron', () => {
  it('parses every-minute wildcard', () => {
    const parsed = parseCron('* * * * *')
    expect(parsed?.minute.size).toBe(60)
    expect(parsed?.hour.size).toBe(24)
  })

  it('parses literals', () => {
    const parsed = parseCron('15 9 * * 1')
    expect([...(parsed?.minute ?? [])]).toEqual([15])
    expect([...(parsed?.hour ?? [])]).toEqual([9])
    expect([...(parsed?.dayOfWeek ?? [])]).toEqual([1])
  })

  it('parses lists', () => {
    const parsed = parseCron('0,15,30,45 * * * *')
    expect([...(parsed?.minute ?? [])]).toEqual([0, 15, 30, 45])
  })

  it('parses ranges', () => {
    const parsed = parseCron('* 9-12 * * *')
    expect([...(parsed?.hour ?? [])]).toEqual([9, 10, 11, 12])
  })

  it('parses steps', () => {
    const parsed = parseCron('*/15 * * * *')
    expect([...(parsed?.minute ?? [])]).toEqual([0, 15, 30, 45])
  })

  it('treats day-of-week 7 as Sunday (0)', () => {
    const parsed = parseCron('0 0 * * 7')
    expect([...(parsed?.dayOfWeek ?? [])]).toEqual([0])
  })

  it('returns null for invalid field counts', () => {
    expect(parseCron('* * * *')).toBeNull()
    expect(parseCron('* * * * * *')).toBeNull()
  })

  it('returns null for out-of-range values', () => {
    expect(parseCron('60 * * * *')).toBeNull()
    expect(parseCron('* 24 * * *')).toBeNull()
    expect(parseCron('* * 32 * *')).toBeNull()
    expect(parseCron('* * * 13 *')).toBeNull()
  })

  it('returns null for backwards ranges', () => {
    expect(parseCron('* 12-9 * * *')).toBeNull()
  })
})

describe('cronPreview', () => {
  it('reports invalid expression', () => {
    const result = cronPreview('not a cron', 5)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid cron expression')
  })

  it('returns the next 3 firings of an every-minute trigger', () => {
    const from = new Date(Date.UTC(2026, 0, 1, 12, 0, 30))
    const result = cronPreview('* * * * *', 3, from)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextRuns.map((d) => d.toISOString())).toEqual([
      '2026-01-01T12:01:00.000Z',
      '2026-01-01T12:02:00.000Z',
      '2026-01-01T12:03:00.000Z',
    ])
  })

  it('returns the next 2 firings of a daily 09:00 UTC trigger', () => {
    const from = new Date(Date.UTC(2026, 0, 1, 12, 0, 0))
    const result = cronPreview('0 9 * * *', 2, from)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextRuns.map((d) => d.toISOString())).toEqual([
      '2026-01-02T09:00:00.000Z',
      '2026-01-03T09:00:00.000Z',
    ])
  })

  it('respects day-of-week constraints (every Monday 09:00 UTC)', () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const result = cronPreview('0 9 * * 1', 3, from)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const days = result.nextRuns.map((d) => d.getUTCDay())
    expect(days.every((d) => d === 1)).toBe(true)
  })

  it('clamps count to a non-negative finite value', () => {
    const result = cronPreview('* * * * *', -3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextRuns).toEqual([])
  })

  it('returns up to 50 occurrences when requested too many', () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const result = cronPreview('* * * * *', 9999, from)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextRuns.length).toBe(50)
  })
})
