import { describe, expect, it } from 'vitest'
import { CostMeter, parseRunContext } from '@agentskit/os-core'
import {
  CostTracker,
  meteredLlmAdapter,
  summarizeRun,
  type LlmAdapter,
} from '../src/index.js'

const ctx = (runId = 'run_1') =>
  parseRunContext({
    runMode: 'real',
    workspaceId: 'team-a',
    runId,
    startedAt: '2026-05-02T00:00:00.000Z',
  })

describe('CostTracker', () => {
  it('records + sums per-run cost', () => {
    const t = new CostTracker()
    t.record('run_1', { system: 'openai', model: 'gpt-4o', costUsd: 0.5 })
    t.record('run_1', { system: 'openai', model: 'gpt-4o', costUsd: 0.25 })
    const r = t.forRun('run_1')
    expect(r.totalUsd).toBe(0.75)
    expect(r.entries.length).toBe(2)
  })

  it('isolates runs', () => {
    const t = new CostTracker()
    t.record('a', { system: 'x', model: 'y', costUsd: 1 })
    t.record('b', { system: 'x', model: 'y', costUsd: 2 })
    expect(t.forRun('a').totalUsd).toBe(1)
    expect(t.forRun('b').totalUsd).toBe(2)
  })

  it('returns zero total for unknown run', () => {
    const t = new CostTracker()
    expect(t.forRun('ghost').totalUsd).toBe(0)
  })

  it('clear removes one run only', () => {
    const t = new CostTracker()
    t.record('a', { system: 'x', model: 'y', costUsd: 1 })
    t.record('b', { system: 'x', model: 'y', costUsd: 2 })
    t.clear('a')
    expect(t.forRun('a').totalUsd).toBe(0)
    expect(t.forRun('b').totalUsd).toBe(2)
  })

  it('totals returns map across all runs', () => {
    const t = new CostTracker()
    t.record('a', { system: 'x', model: 'y', costUsd: 1.5 })
    t.record('b', { system: 'x', model: 'y', costUsd: 0.5 })
    const totals = t.totals()
    expect(totals.get('a')).toBe(1.5)
    expect(totals.get('b')).toBe(0.5)
  })
})

describe('meteredLlmAdapter', () => {
  it('uses adapter-reported costUsd directly', async () => {
    const tracker = new CostTracker()
    const inner: LlmAdapter = {
      id: 'fake',
      invoke: async () => ({
        text: 'hi',
        finishReason: 'stop',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.0042,
      }),
    }
    const adapter = meteredLlmAdapter(inner, { tracker })
    await adapter.invoke({ system: 'openai', model: 'gpt-4o', messages: [] }, ctx())
    expect(tracker.forRun('run_1').totalUsd).toBe(0.0042)
  })

  it('falls back to CostMeter when costUsd absent', async () => {
    const meter = new CostMeter()
    meter.register({
      provider: 'openai',
      model: 'gpt-4o',
      inputPerMillion: 2.5,
      outputPerMillion: 10,
      currency: 'USD',
    })
    const tracker = new CostTracker()
    const inner: LlmAdapter = {
      id: 'fake',
      invoke: async () => ({
        text: 'hi',
        finishReason: 'stop',
        inputTokens: 1_000_000,
        outputTokens: 500_000,
      }),
    }
    const adapter = meteredLlmAdapter(inner, { tracker, meter })
    await adapter.invoke({ system: 'openai', model: 'gpt-4o', messages: [] }, ctx())
    expect(tracker.forRun('run_1').totalUsd).toBeCloseTo(7.5)
  })

  it('attaches nodeId when currentNodeId provided', async () => {
    const tracker = new CostTracker()
    const inner: LlmAdapter = {
      id: 'fake',
      invoke: async () => ({ text: '', finishReason: 'stop', costUsd: 0.1 }),
    }
    const adapter = meteredLlmAdapter(inner, {
      tracker,
      currentNodeId: () => 'node-x',
    })
    await adapter.invoke({ system: 'openai', model: 'gpt-4o', messages: [] }, ctx())
    expect(tracker.forRun('run_1').entries[0]?.nodeId).toBe('node-x')
  })

  it('skips recording when no cost reported and no meter', async () => {
    const tracker = new CostTracker()
    const inner: LlmAdapter = {
      id: 'fake',
      invoke: async () => ({ text: '', finishReason: 'stop' }),
    }
    const adapter = meteredLlmAdapter(inner, { tracker })
    await adapter.invoke({ system: 'openai', model: 'gpt-4o', messages: [] }, ctx())
    expect(tracker.forRun('run_1').entries.length).toBe(0)
  })

  it('preserves underlying adapter id', () => {
    const inner: LlmAdapter = {
      id: 'real-anthropic',
      invoke: async () => ({ text: '', finishReason: 'stop' }),
    }
    const adapter = meteredLlmAdapter(inner, { tracker: new CostTracker() })
    expect(adapter.id).toBe('real-anthropic')
  })
})

describe('summarizeRun', () => {
  it('sums by node', () => {
    const t = new CostTracker()
    t.record('r', { system: 'openai', model: 'gpt-4o', costUsd: 1, nodeId: 'a' })
    t.record('r', { system: 'openai', model: 'gpt-4o', costUsd: 2, nodeId: 'b' })
    t.record('r', { system: 'openai', model: 'gpt-4o', costUsd: 3, nodeId: 'a' })
    const s = summarizeRun(t.forRun('r'))
    expect(s.byNode.get('a')).toBe(4)
    expect(s.byNode.get('b')).toBe(2)
    expect(s.totalUsd).toBe(6)
  })

  it('sums by model', () => {
    const t = new CostTracker()
    t.record('r', { system: 'openai', model: 'gpt-4o', costUsd: 1 })
    t.record('r', { system: 'openai', model: 'gpt-4o', costUsd: 2 })
    t.record('r', { system: 'anthropic', model: 'claude-opus-4-7', costUsd: 5 })
    const s = summarizeRun(t.forRun('r'))
    expect(s.byModel.get('openai:gpt-4o')).toBe(3)
    expect(s.byModel.get('anthropic:claude-opus-4-7')).toBe(5)
  })

  it('returns USD currency by default', () => {
    const t = new CostTracker()
    t.record('r', { system: 'x', model: 'y', costUsd: 1 })
    expect(summarizeRun(t.forRun('r')).currency).toBe('USD')
  })
})
