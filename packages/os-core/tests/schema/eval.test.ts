import { describe, expect, it } from 'vitest'
import {
  parseDomainPack,
  parseEvalDef,
  parseEvalSuite,
  passesThreshold,
} from '../../src/schema/eval.js'

describe('passesThreshold', () => {
  const c = (op: '<' | '<=' | '>' | '>=' | '==', target: number) =>
    ({ kind: 'threshold' as const, metric: 'm', operator: op, target })

  it('handles all operators', () => {
    expect(passesThreshold(c('<', 10), 5)).toBe(true)
    expect(passesThreshold(c('<', 10), 10)).toBe(false)
    expect(passesThreshold(c('<=', 10), 10)).toBe(true)
    expect(passesThreshold(c('>', 5), 10)).toBe(true)
    expect(passesThreshold(c('>=', 10), 10)).toBe(true)
    expect(passesThreshold(c('==', 10), 10)).toBe(true)
    expect(passesThreshold(c('==', 10), 9)).toBe(false)
  })
})

describe('EvalDef + EvalSuite + DomainPack parsing', () => {
  const baseEval = {
    id: 'e1',
    name: 'eval one',
    domain: 'dev',
    criteria: [
      { kind: 'threshold', metric: 'accuracy', operator: '>=', target: 0.9 },
    ],
  }

  it('parses minimum eval def', () => {
    const e = parseEvalDef(baseEval)
    expect(e.criteria).toHaveLength(1)
  })

  it('parses llm_judge criterion', () => {
    const e = parseEvalDef({
      ...baseEval,
      criteria: [{
        kind: 'llm_judge',
        rubric: 'is the answer correct?',
        judgeModel: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
        passThreshold: 0.8,
      }],
    })
    expect(e.criteria[0]?.kind).toBe('llm_judge')
  })

  it('parses golden_set criterion', () => {
    const e = parseEvalDef({
      ...baseEval,
      criteria: [{
        kind: 'golden_set',
        fixturesPath: 'evals/dev/x.jsonl',
        comparator: 'exact',
        passRate: 0.95,
      }],
    })
    expect(e.criteria[0]?.kind).toBe('golden_set')
  })

  it('parses an EvalSuite', () => {
    const s = parseEvalSuite({ schemaVersion: 1, id: 's1', name: 'suite', evals: [baseEval] })
    expect(s.evals).toHaveLength(1)
  })

  it('parses a DomainPack', () => {
    const p = parseDomainPack({
      schemaVersion: 1,
      domain: 'dev',
      name: 'dev pack',
      suites: [{ schemaVersion: 1, id: 's', name: 'suite', evals: [baseEval] }],
    })
    expect(p.domain).toBe('dev')
  })

  it('rejects empty criteria array', () => {
    expect(() => parseEvalDef({ ...baseEval, criteria: [] })).toThrow()
  })
})
