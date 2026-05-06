import { describe, expect, it } from 'vitest'
import {
  SliSloContract,
  evaluateSliSloContract,
} from '../../src/index.js'

describe('SliSloContract (#217)', () => {
  it('parses a minimal contract', () => {
    const c = SliSloContract.parse({
      owner: 'agent:fix-bot',
      slos: [
        {
          id: 'p95_latency_under_250ms',
          kind: 'latency_ms',
          comparison: 'lte',
          target: 250,
          percentile: 95,
          window: { durationLabel: 'PT5M', minSamples: 10 },
        },
      ],
    })
    expect(c.owner).toBe('agent:fix-bot')
    expect(c.slos).toHaveLength(1)
  })
})

describe('evaluateSliSloContract (#217)', () => {
  const contract = SliSloContract.parse({
    owner: 'flow:issue-to-pr',
    slos: [
      {
        id: 'p95_latency',
        kind: 'latency_ms',
        comparison: 'lte',
        target: 250,
        percentile: 95,
        window: { durationLabel: 'PT5M', minSamples: 5 },
      },
      {
        id: 'success_rate_99',
        kind: 'success_rate',
        comparison: 'gte',
        target: 0.99,
        window: { durationLabel: 'PT5M', minSamples: 5 },
      },
      {
        id: 'cost_under_2usd',
        kind: 'cost_usd',
        comparison: 'lte',
        target: 2,
        window: { durationLabel: 'PT5M', minSamples: 1 },
      },
    ],
  })

  it('passes when latency p95 meets the target', () => {
    const samples = [
      ...Array.from({ length: 19 }, () => ({ kind: 'latency_ms' as const, value: 100 })),
      { kind: 'latency_ms' as const, value: 240 },
    ]
    const v = evaluateSliSloContract(contract, samples)
    const latency = v.find((x) => x.id === 'p95_latency')
    expect(latency?.status).toBe('pass')
  })

  it('fails when latency p95 exceeds the target', () => {
    const samples = [
      ...Array.from({ length: 19 }, () => ({ kind: 'latency_ms' as const, value: 100 })),
      { kind: 'latency_ms' as const, value: 9999 },
    ]
    const v = evaluateSliSloContract(contract, samples)
    const latency = v.find((x) => x.id === 'p95_latency')
    expect(latency?.status).toBe('fail')
    expect(latency?.observed).toBeGreaterThan(250)
  })

  it('returns insufficient_data when minSamples is not met', () => {
    const v = evaluateSliSloContract(contract, [
      { kind: 'latency_ms', value: 100 },
    ])
    const latency = v.find((x) => x.id === 'p95_latency')
    expect(latency?.status).toBe('insufficient_data')
  })

  it('aggregates success_rate as a mean', () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({
      kind: 'success_rate' as const,
      value: i < 99 ? 1 : 0,
    }))
    const v = evaluateSliSloContract(contract, samples)
    const sr = v.find((x) => x.id === 'success_rate_99')
    expect(sr?.status).toBe('pass')
    expect(sr?.observed).toBeCloseTo(0.99, 2)
  })

  it('sums cost_usd over the window', () => {
    const samples = [
      { kind: 'cost_usd' as const, value: 0.5 },
      { kind: 'cost_usd' as const, value: 1 },
    ]
    const v = evaluateSliSloContract(contract, samples)
    const cost = v.find((x) => x.id === 'cost_under_2usd')
    expect(cost?.status).toBe('pass')
    expect(cost?.observed).toBeCloseTo(1.5)
  })
})
