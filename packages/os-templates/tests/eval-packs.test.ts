import { describe, expect, it } from 'vitest'
import { BUILTIN_EVAL_PACKS, findPack } from '../src/eval-packs/index.js'

describe('BUILTIN_EVAL_PACKS', () => {
  it('covers all four personas', () => {
    const domains = BUILTIN_EVAL_PACKS.map((p) => p.domain).sort()
    expect(domains).toEqual(['agency', 'clinical', 'dev', 'non-tech'])
  })

  it('every suite has at least one eval', () => {
    for (const pack of BUILTIN_EVAL_PACKS) {
      for (const s of pack.suites) {
        expect(s.evals.length).toBeGreaterThan(0)
      }
    }
  })

  it('mixes threshold + llm_judge + golden_set across packs', () => {
    const kinds = new Set<string>()
    for (const pack of BUILTIN_EVAL_PACKS) {
      for (const s of pack.suites) {
        for (const e of s.evals) {
          for (const c of e.criteria) kinds.add(c.kind)
        }
      }
    }
    expect(kinds.has('threshold')).toBe(true)
    expect(kinds.has('llm_judge')).toBe(true)
    expect(kinds.has('golden_set')).toBe(true)
  })

  it('findPack returns the matching pack', () => {
    expect(findPack('clinical')?.name).toMatch(/Clinical/)
    expect(findPack('non-tech')?.domain).toBe('non-tech')
  })
})
