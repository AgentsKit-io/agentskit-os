import { describe, expect, it } from 'vitest'
import { applyFieldRedaction } from '../src/field-redaction.js'

const MASK = '[REDACTED]'
const redact = (s: string): string => MASK

describe('applyFieldRedaction (#187)', () => {
  it('returns input untouched when selectors are empty', () => {
    const input = { a: 'x', b: { c: 'y' } }
    expect(applyFieldRedaction(input, { selectors: [], redact })).toEqual(input)
  })

  it('redacts simple top-level fields', () => {
    const out = applyFieldRedaction(
      { prompt: 'secret', meta: 'ok' },
      { selectors: ['prompt'], redact },
    )
    expect(out).toEqual({ prompt: MASK, meta: 'ok' })
  })

  it('matches wildcards across array indices', () => {
    const out = applyFieldRedaction(
      { spans: [{ prompt: 'a' }, { prompt: 'b' }] },
      { selectors: ['spans.*.prompt'], redact },
    )
    expect(out).toEqual({ spans: [{ prompt: MASK }, { prompt: MASK }] })
  })

  it('matches wildcards across object keys', () => {
    const out = applyFieldRedaction(
      { attributes: { user: { value: 'u' }, role: { value: 'r' } } },
      { selectors: ['attributes.*.value'], redact },
    )
    expect(out).toEqual({
      attributes: { user: { value: MASK }, role: { value: MASK } },
    })
  })

  it('does not coerce non-strings at matching paths', () => {
    const out = applyFieldRedaction(
      { count: 42, nested: { count: 7 } },
      { selectors: ['count', 'nested.count'], redact },
    )
    expect(out).toEqual({ count: 42, nested: { count: 7 } })
  })

  it('does not mutate the input', () => {
    const input = { spans: [{ prompt: 'a' }] }
    const out = applyFieldRedaction(input, { selectors: ['spans.*.prompt'], redact })
    expect(input.spans[0]?.prompt).toBe('a')
    expect((out as { spans: { prompt: string }[] }).spans[0]?.prompt).toBe(MASK)
  })

  it('respects exact path length (no recursive descent)', () => {
    const out = applyFieldRedaction(
      { a: { b: { c: 'leaf' } } },
      { selectors: ['a.b'], redact },
    )
    // selector matches `a.b` (an object), not the string leaf — no change.
    expect(out).toEqual({ a: { b: { c: 'leaf' } } })
  })
})
