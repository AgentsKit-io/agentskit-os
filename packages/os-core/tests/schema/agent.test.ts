import { describe, expect, it } from 'vitest'
import {
  AgentConfig,
  parseAgentConfig,
  safeParseAgentConfig,
} from '../../src/schema/agent.js'

const baseValid = {
  id: 'researcher',
  name: 'Researcher',
  model: { provider: 'openai', model: 'gpt-4o' },
}

describe('AgentConfig schema', () => {
  describe('parse — accept', () => {
    it('parses minimal config', () => {
      const result = parseAgentConfig(baseValid)
      expect(result.id).toBe('researcher')
      expect(result.tools).toEqual([])
      expect(result.skills).toEqual([])
      expect(result.tags).toEqual([])
    })

    it('parses with tools and skills', () => {
      const result = parseAgentConfig({
        ...baseValid,
        tools: ['web-search', 'code-exec'],
        skills: ['critic'],
      })
      expect(result.tools).toHaveLength(2)
      expect(result.skills).toEqual(['critic'])
    })

    it('parses model tuning params', () => {
      const result = parseAgentConfig({
        ...baseValid,
        model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.7, topP: 0.9 },
      })
      expect(result.model.temperature).toBe(0.7)
    })

    it('parses memory ref', () => {
      const result = parseAgentConfig({
        ...baseValid,
        memory: { ref: 'sqlite:./data/agent.db', maxMessages: 100 },
      })
      expect(result.memory?.ref).toBe('sqlite:./data/agent.db')
    })
  })

  describe('parse — reject', () => {
    it('rejects missing model', () => {
      const result = safeParseAgentConfig({ id: 'x', name: 'X' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid id slug', () => {
      const result = safeParseAgentConfig({ ...baseValid, id: 'Bad ID' })
      expect(result.success).toBe(false)
    })

    it('rejects temperature out of range', () => {
      const result = safeParseAgentConfig({
        ...baseValid,
        model: { provider: 'openai', model: 'gpt-4o', temperature: 2.5 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative maxTokens', () => {
      const result = safeParseAgentConfig({
        ...baseValid,
        model: { provider: 'openai', model: 'gpt-4o', maxTokens: -1 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects topP > 1', () => {
      const result = safeParseAgentConfig({
        ...baseValid,
        model: { provider: 'openai', model: 'gpt-4o', topP: 1.5 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects > 128 tools', () => {
      const tools = Array.from({ length: 129 }, (_, i) => `tool-${i}`)
      const result = safeParseAgentConfig({ ...baseValid, tools })
      expect(result.success).toBe(false)
    })

    it('rejects > 64 skills', () => {
      const skills = Array.from({ length: 65 }, (_, i) => `skill-${i}`)
      const result = safeParseAgentConfig({ ...baseValid, skills })
      expect(result.success).toBe(false)
    })

    it('rejects systemPrompt over 32k chars', () => {
      const result = safeParseAgentConfig({ ...baseValid, systemPrompt: 'x'.repeat(32_769) })
      expect(result.success).toBe(false)
    })

    it('throws on parseAgentConfig with invalid input', () => {
      expect(() => parseAgentConfig({})).toThrow()
    })
  })

  describe('schema export shape', () => {
    it('exposes a parse function', () => {
      expect(typeof AgentConfig.parse).toBe('function')
    })
  })
})
