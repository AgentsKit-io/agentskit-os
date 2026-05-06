import { describe, expect, it } from 'vitest'
import {
  AgentConfig,
  cloneAgentWithVariation,
} from '../../src/index.js'

const base = AgentConfig.parse({
  id: 'planner',
  name: 'Planner',
  systemPrompt: 'Plan things.',
  model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.5 },
  tools: ['tools.git.diff', 'tools.shell.run'],
  skills: [],
  ragRefs: [],
  tags: ['core'],
})

describe('cloneAgentWithVariation (#99)', () => {
  it('overrides model and clamps temperature delta', () => {
    const clone = cloneAgentWithVariation(base, {
      newId: 'planner-fast',
      variation: {
        modelOverride: 'claude-haiku-4-5-20251001',
        temperatureDelta: 0.4,
      },
    })
    expect(clone.model.model).toBe('claude-haiku-4-5-20251001')
    expect(clone.model.temperature).toBeCloseTo(0.9)
  })

  it('appends a system prompt suffix', () => {
    const clone = cloneAgentWithVariation(base, {
      newId: 'planner-loud',
      variation: { systemPromptSuffix: 'Be terse.' },
    })
    expect(clone.systemPrompt).toContain('Plan things.')
    expect(clone.systemPrompt).toContain('Variation: Be terse.')
  })

  it('removes + adds tools without duplication', () => {
    const clone = cloneAgentWithVariation(base, {
      newId: 'planner-trim',
      variation: {
        removeTools: ['tools.shell.run'],
        addTools: ['tools.git.diff', 'tools.notify.slack'],
      },
    })
    expect(clone.tools).toEqual(['tools.git.diff', 'tools.notify.slack'])
  })

  it('adds variant tag when supplied', () => {
    const clone = cloneAgentWithVariation(base, {
      newId: 'planner-x',
      variation: { variantTag: 'variant:experiment-A' },
    })
    expect(clone.tags).toContain('variant:experiment-A')
  })

  it('preserves the forked-from tag from forkAgentConfig', () => {
    const clone = cloneAgentWithVariation(base, {
      newId: 'planner-y',
      variation: {},
    })
    expect(clone.tags).toContain('forked-from:planner')
  })
})
