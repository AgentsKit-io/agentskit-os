import { describe, expect, it } from 'vitest'
import {
  CostMeter,
  checkBudget,
  computeCost,
  parseModelPricing,
  safeParseModelPricing,
} from '../../src/cost/cost-meter.js'

const pricing = parseModelPricing({
  provider: 'openai',
  model: 'gpt-4o',
  inputPerMillion: 2.5,
  outputPerMillion: 10,
  cachedInputPerMillion: 1.25,
})

describe('ModelPricing schema', () => {
  it('parses minimal pricing', () => {
    expect(pricing.currency).toBe('USD')
  })

  it('rejects negative input price', () => {
    expect(
      safeParseModelPricing({
        provider: 'x',
        model: 'm',
        inputPerMillion: -1,
        outputPerMillion: 1,
      }).success,
    ).toBe(false)
  })

  it('rejects unknown currency', () => {
    expect(
      safeParseModelPricing({
        provider: 'x',
        model: 'm',
        inputPerMillion: 1,
        outputPerMillion: 1,
        currency: 'XYZ',
      }).success,
    ).toBe(false)
  })

  it('parses with effectiveFrom + effectiveTo', () => {
    const p = parseModelPricing({
      provider: 'openai',
      model: 'gpt-4o',
      inputPerMillion: 2.5,
      outputPerMillion: 10,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z',
    })
    expect(p.effectiveFrom).toBeDefined()
  })
})

describe('computeCost', () => {
  it('computes input + output cost', () => {
    const c = computeCost({ inputTokens: 1_000_000, outputTokens: 500_000 }, pricing)
    expect(c.input).toBe(2.5)
    expect(c.output).toBe(5)
    expect(c.total).toBe(7.5)
  })

  it('subtracts cached tokens from billable input', () => {
    const c = computeCost(
      { inputTokens: 1_000_000, cachedInputTokens: 500_000, outputTokens: 0 },
      pricing,
    )
    expect(c.input).toBeCloseTo(1.25)
    expect(c.cachedInput).toBeCloseTo(0.625)
    expect(c.total).toBeCloseTo(1.875)
  })

  it('zero usage = zero cost', () => {
    const c = computeCost({}, pricing)
    expect(c.total).toBe(0)
  })

  it('image + audio pricing', () => {
    const p = parseModelPricing({
      provider: 'openai',
      model: 'whisper',
      inputPerMillion: 0,
      outputPerMillion: 0,
      imagesPerCall: 0.05,
      audioPerSecond: 0.006,
    })
    const c = computeCost({ images: 4, audioSeconds: 30 }, p)
    expect(c.images).toBeCloseTo(0.2)
    expect(c.audio).toBeCloseTo(0.18)
    expect(c.total).toBeCloseTo(0.38)
  })

  it('returns currency from pricing', () => {
    const eur = parseModelPricing({
      provider: 'mistral',
      model: 'large',
      inputPerMillion: 2,
      outputPerMillion: 6,
      currency: 'EUR',
    })
    const c = computeCost({ inputTokens: 1_000_000 }, eur)
    expect(c.currency).toBe('EUR')
  })
})

describe('CostMeter', () => {
  it('registers + looks up + meters', () => {
    const m = new CostMeter()
    m.register(pricing)
    expect(m.size).toBe(1)
    const c = m.meter(
      { provider: 'openai', model: 'gpt-4o' },
      { inputTokens: 1_000_000, outputTokens: 0 },
    )
    expect(c?.input).toBe(2.5)
  })

  it('returns undefined for unknown model', () => {
    const m = new CostMeter()
    const c = m.meter({ provider: 'x', model: 'y' }, { inputTokens: 100 })
    expect(c).toBeUndefined()
  })

  it('falls back to unpinned when pinned version not registered', () => {
    const m = new CostMeter()
    m.register(pricing)
    const c = m.meter(
      { provider: 'openai', model: 'gpt-4o', pinnedVersion: '2026-05-01' },
      { inputTokens: 1_000_000 },
    )
    expect(c?.input).toBe(2.5)
  })

  it('respects effectiveFrom window', () => {
    const m = new CostMeter()
    m.register(
      parseModelPricing({
        provider: 'openai',
        model: 'gpt-4o',
        inputPerMillion: 5,
        outputPerMillion: 15,
        effectiveFrom: '2026-06-01T00:00:00.000Z',
      }),
    )
    expect(m.lookup({ provider: 'openai', model: 'gpt-4o' }, new Date('2026-05-15Z'))).toBeUndefined()
    expect(m.lookup({ provider: 'openai', model: 'gpt-4o' }, new Date('2026-06-15Z'))).toBeDefined()
  })

  it('unregister removes entry', () => {
    const m = new CostMeter()
    m.register(pricing)
    expect(m.unregister({ provider: 'openai', model: 'gpt-4o' })).toBe(true)
    expect(m.size).toBe(0)
  })
})

describe('checkBudget', () => {
  it('within when no limits', () => {
    expect(
      checkBudget({ workspaceId: 'team-a', spentToday: 100, spentMonth: 1000 }).kind,
    ).toBe('within')
  })

  it('within when below daily limit', () => {
    const d = checkBudget({
      workspaceId: 'team-a',
      spentToday: 5,
      spentMonth: 50,
      dailyLimit: 10,
      monthlyLimit: 100,
    })
    expect(d.kind).toBe('within')
  })

  it('exceeded when projected daily exceeds limit', () => {
    const d = checkBudget(
      { workspaceId: 'team-a', spentToday: 9, spentMonth: 50, dailyLimit: 10 },
      5,
    )
    expect(d.kind).toBe('exceeded')
    if (d.kind === 'exceeded') expect(d.scope).toBe('daily')
  })

  it('exceeded when monthly exceeded', () => {
    const d = checkBudget(
      {
        workspaceId: 'team-a',
        spentToday: 5,
        spentMonth: 95,
        dailyLimit: 100,
        monthlyLimit: 100,
      },
      10,
    )
    expect(d.kind).toBe('exceeded')
    if (d.kind === 'exceeded') expect(d.scope).toBe('monthly')
  })

  it('daily takes precedence over monthly when both exceeded', () => {
    const d = checkBudget(
      { workspaceId: 'team-a', spentToday: 9, spentMonth: 95, dailyLimit: 10, monthlyLimit: 100 },
      5,
    )
    expect(d.kind).toBe('exceeded')
    if (d.kind === 'exceeded') expect(d.scope).toBe('daily')
  })
})
