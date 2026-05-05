import { describe, expect, it } from 'vitest'
import {
  RUN_MODES,
  RUN_MODE_POLICY,
  RunMode,
  escalationRule,
  checkDeterminism,
  parseRunContext,
  safeParseRunContext,
  createDefaultRunId,
  isStubRunMode,
} from '../../src/runtime/run-mode.js'

describe('RUN_MODES', () => {
  it('exposes all 6 modes', () => {
    expect(RUN_MODES).toEqual([
      'real',
      'preview',
      'dry_run',
      'replay',
      'simulate',
      'deterministic',
    ])
  })

  it.each(RUN_MODES)('%s parses via RunMode zod enum', (m) => {
    expect(RunMode.safeParse(m).success).toBe(true)
  })

  it('rejects unknown mode', () => {
    expect(RunMode.safeParse('cosmic').success).toBe(false)
  })
})

describe('RUN_MODE_POLICY', () => {
  it('real charges cost and persists', () => {
    expect(RUN_MODE_POLICY.real.chargeCost).toBe(true)
    expect(RUN_MODE_POLICY.real.persistState).toBe(true)
  })

  it('dry_run is free and ephemeral', () => {
    expect(RUN_MODE_POLICY.dry_run.chargeCost).toBe(false)
    expect(RUN_MODE_POLICY.dry_run.persistState).toBe(false)
  })

  it('preview restricts side effects to read-only', () => {
    expect(RUN_MODE_POLICY.preview.sideEffects).toBe('read-only')
  })

  it('deterministic uses live-pinned LLM', () => {
    expect(RUN_MODE_POLICY.deterministic.llm).toBe('live-pinned')
  })

  it('replay reads from event log', () => {
    expect(RUN_MODE_POLICY.replay.llm).toBe('event-log')
    expect(RUN_MODE_POLICY.replay.sideEffects).toBe('event-log')
  })
})

describe('escalationRule', () => {
  it('dry_run → real allowed', () => {
    expect(escalationRule('dry_run', 'real')).toBe('allowed')
  })

  it('preview → real requires hitl', () => {
    expect(escalationRule('preview', 'real')).toBe('allowed-with-hitl')
  })

  it('replay → real forbidden, must branch', () => {
    expect(escalationRule('replay', 'real')).toBe('forbidden-must-branch')
  })

  it('simulate → real forbidden, must reauthor', () => {
    expect(escalationRule('simulate', 'real')).toBe('forbidden-must-reauthor')
  })

  it('deterministic → real forbidden, must demote', () => {
    expect(escalationRule('deterministic', 'real')).toBe('forbidden-must-demote')
  })

  it('same mode is allowed', () => {
    expect(escalationRule('real', 'real')).toBe('allowed')
  })

  it('any mode → dry_run is allowed', () => {
    for (const m of RUN_MODES) {
      expect(escalationRule(m, 'dry_run')).toBe('allowed')
    }
  })
})

describe('checkDeterminism', () => {
  it('passes pinned, temp=0 agent with stubbed tools', () => {
    const issues = checkDeterminism({
      agents: [{ id: 'a', model: { provider: 'openai', model: 'gpt-4o-2026-05-01', temperature: 0 } }],
      tools: [{ id: 't', deterministicStub: true }],
    })
    expect(issues).toEqual([])
  })

  it('rejects non-zero temperature', () => {
    const issues = checkDeterminism({
      agents: [{ id: 'a', model: { provider: 'openai', model: 'gpt-4o-2026-05-01', temperature: 0.7 } }],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.code).toBe('non_zero_temperature')
  })

  it('rejects unpinned model', () => {
    const issues = checkDeterminism({
      agents: [{ id: 'a', model: { provider: 'openai', model: 'gpt-4o', temperature: 0 } }],
    })
    expect(issues[0]?.code).toBe('unpinned_model')
  })

  it('reports missing tool stub', () => {
    const issues = checkDeterminism({
      tools: [{ id: 'x', deterministicStub: false }],
    })
    expect(issues[0]?.code).toBe('missing_stub')
  })

  it('reports uncontrolled randomness sources', () => {
    const issues = checkDeterminism({
      randomnessSources: ['Date.now', 'Math.random'],
    })
    expect(issues).toHaveLength(2)
    expect(issues.every((i) => i.code === 'uncontrolled_randomness')).toBe(true)
  })

  it('aggregates multiple issues', () => {
    const issues = checkDeterminism({
      agents: [{ id: 'a', model: { provider: 'openai', model: 'gpt-4o', temperature: 0.5 } }],
      tools: [{ id: 't', deterministicStub: false }],
    })
    expect(issues).toHaveLength(3)
  })
})

describe('RunContext', () => {
  const valid = {
    runMode: 'real' as const,
    workspaceId: 'team-a',
    runId: 'run_1',
    startedAt: '2026-05-01T17:00:00.000Z',
  }

  it('parses valid context', () => {
    const c = parseRunContext(valid)
    expect(c.runMode).toBe('real')
  })

  it('parses with parentRunId', () => {
    const c = parseRunContext({ ...valid, parentRunId: 'parent_1' })
    expect(c.parentRunId).toBe('parent_1')
  })

  it('rejects invalid runMode', () => {
    expect(safeParseRunContext({ ...valid, runMode: 'cosmic' }).success).toBe(false)
  })

  it('rejects malformed startedAt', () => {
    expect(safeParseRunContext({ ...valid, startedAt: 'yesterday' }).success).toBe(false)
  })

  it('throws on parseRunContext with invalid input', () => {
    expect(() => parseRunContext({})).toThrow()
  })
})

describe('createDefaultRunId', () => {
  it('returns distinct run_* ids', () => {
    const a = createDefaultRunId()
    const b = createDefaultRunId()
    expect(a).toMatch(/^run_[a-z0-9]+_[a-z0-9]+$/)
    expect(b).toMatch(/^run_[a-z0-9]+_[a-z0-9]+$/)
    expect(a).not.toBe(b)
  })
})

describe('isStubRunMode', () => {
  it('is true for stub modes only', () => {
    expect(isStubRunMode('dry_run')).toBe(true)
    expect(isStubRunMode('preview')).toBe(true)
    expect(isStubRunMode('replay')).toBe(true)
    expect(isStubRunMode('simulate')).toBe(true)
    expect(isStubRunMode('real')).toBe(false)
    expect(isStubRunMode('deterministic')).toBe(false)
  })
})
