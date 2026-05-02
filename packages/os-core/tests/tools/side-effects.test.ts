import { describe, expect, it } from 'vitest'
import {
  SIDE_EFFECTS,
  SideEffect,
  SideEffectList,
  decideToolAction,
  maxSeverity,
} from '../../src/tools/side-effects.js'

describe('SideEffect enum', () => {
  it('exposes 5 values in severity order', () => {
    expect(SIDE_EFFECTS).toEqual(['none', 'read', 'write', 'destructive', 'external'])
  })

  it.each(SIDE_EFFECTS)('parses %s', (s) => {
    expect(SideEffect.safeParse(s).success).toBe(true)
  })

  it('rejects unknown value', () => {
    expect(SideEffect.safeParse('cosmic').success).toBe(false)
  })

  it('rejects empty list', () => {
    expect(SideEffectList.safeParse([]).success).toBe(false)
  })
})

describe('maxSeverity', () => {
  it('picks destructive over read', () => {
    expect(maxSeverity(['read', 'destructive'])).toBe('destructive')
  })

  it('picks external over write', () => {
    expect(maxSeverity(['write', 'external'])).toBe('external')
  })

  it('destructive beats external (highest)', () => {
    expect(maxSeverity(['external', 'destructive'])).toBe('destructive')
  })

  it('returns external as default for empty list', () => {
    expect(maxSeverity([])).toBe('external')
  })

  it('single value passes through', () => {
    expect(maxSeverity(['none'])).toBe('none')
  })
})

describe('decideToolAction', () => {
  it('real + read → run', () => {
    const d = decideToolAction('real', ['read'])
    expect(d.action).toBe('run')
    expect(d.severity).toBe('read')
  })

  it('real + destructive → run-with-audit', () => {
    expect(decideToolAction('real', ['destructive']).action).toBe('run-with-audit')
  })

  it('real + external → run-with-audit-and-egress-check', () => {
    expect(decideToolAction('real', ['external']).action).toBe('run-with-audit-and-egress-check')
  })

  it('preview + write → block', () => {
    expect(decideToolAction('preview', ['write']).action).toBe('block')
  })

  it('preview + destructive → block', () => {
    expect(decideToolAction('preview', ['destructive']).action).toBe('block')
  })

  it('preview + read → run', () => {
    expect(decideToolAction('preview', ['read']).action).toBe('run')
  })

  it('dry_run always stubs', () => {
    for (const s of SIDE_EFFECTS) {
      expect(decideToolAction('dry_run', [s]).action).toBe('stub')
    }
  })

  it('replay + write → replay-no-op', () => {
    expect(decideToolAction('replay', ['write']).action).toBe('replay-no-op')
  })

  it('simulate + destructive → mocked', () => {
    expect(decideToolAction('simulate', ['destructive']).action).toBe('mocked')
  })

  it('deterministic + external → run-require-fixture', () => {
    expect(decideToolAction('deterministic', ['external']).action).toBe('run-require-fixture')
  })

  it('uses max severity across multiple effects', () => {
    expect(decideToolAction('preview', ['read', 'write']).action).toBe('block')
  })
})
