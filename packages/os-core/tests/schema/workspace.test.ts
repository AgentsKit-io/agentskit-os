import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  WorkspaceConfig,
  DataResidencyConfig,
  parseWorkspaceConfig,
  safeParseWorkspaceConfig,
} from '../../src/schema/workspace.js'

describe('WorkspaceConfig schema', () => {
  describe('parse — accept', () => {
    it('parses a minimal valid config', () => {
      const input = {
        schemaVersion: 1,
        id: 'team-alpha',
        name: 'Team Alpha',
      }
      const result = parseWorkspaceConfig(input)
      expect(result.id).toBe('team-alpha')
      expect(result.isolation).toBe('strict')
      expect(result.tags).toEqual([])
    })

    it('parses a fully-populated config', () => {
      const input = {
        schemaVersion: 1,
        id: 'agency-1',
        name: 'Agency One',
        isolation: 'shared',
        dataDir: '/var/lib/agentskitos/agency-1',
        description: 'Marketing agency workspace',
        tags: ['marketing', 'prod'],
      }
      const result = parseWorkspaceConfig(input)
      expect(result.isolation).toBe('shared')
      expect(result.tags).toEqual(['marketing', 'prod'])
    })

    it('exports schema version constant', () => {
      expect(SCHEMA_VERSION).toBe(1)
    })

    it('accepts single-character slug ids', () => {
      const result = parseWorkspaceConfig({ schemaVersion: 1, id: 'a', name: 'A' })
      expect(result.id).toBe('a')
    })
  })

  describe('parse — reject', () => {
    it('rejects unsupported schemaVersion', () => {
      const result = safeParseWorkspaceConfig({ schemaVersion: 2, id: 'x', name: 'X' })
      expect(result.success).toBe(false)
    })

    it('rejects uppercase id', () => {
      const result = safeParseWorkspaceConfig({ schemaVersion: 1, id: 'BadId', name: 'X' })
      expect(result.success).toBe(false)
    })

    it('rejects id with leading hyphen', () => {
      const result = safeParseWorkspaceConfig({ schemaVersion: 1, id: '-bad', name: 'X' })
      expect(result.success).toBe(false)
    })

    it('rejects id with trailing hyphen', () => {
      const result = safeParseWorkspaceConfig({ schemaVersion: 1, id: 'bad-', name: 'X' })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = safeParseWorkspaceConfig({ schemaVersion: 1, id: 'ok', name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects unknown isolation value', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        isolation: 'public',
      })
      expect(result.success).toBe(false)
    })

    it('rejects more than 32 tags', () => {
      const tags = Array.from({ length: 33 }, (_, i) => `t${i}`)
      const result = safeParseWorkspaceConfig({ schemaVersion: 1, id: 'ok', name: 'Ok', tags })
      expect(result.success).toBe(false)
    })

    it('rejects description over 512 chars', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        description: 'x'.repeat(513),
      })
      expect(result.success).toBe(false)
    })

    it('throws on parseWorkspaceConfig with invalid input', () => {
      expect(() => parseWorkspaceConfig({})).toThrow()
    })
  })

  describe('schema export shape', () => {
    it('exposes a parse function', () => {
      expect(typeof WorkspaceConfig.parse).toBe('function')
    })
  })

  describe('limits', () => {
    it('parses with full limits block', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        limits: {
          tokensPerRun: 100_000,
          usdPerRun: 5,
          tokensPerDay: 10_000_000,
          usdPerDay: 500,
          wallClockMsPerRun: 60_000,
          maxConcurrentRuns: 10,
          maxStepsPerRun: 1000,
        },
      })
      expect(result.limits?.tokensPerRun).toBe(100_000)
    })

    it('accepts partial limits', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        limits: { usdPerRun: 1.5 },
      })
      expect(result.limits?.usdPerRun).toBe(1.5)
    })

    it('rejects negative usdPerRun', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        limits: { usdPerRun: -1 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects zero maxConcurrentRuns', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        limits: { maxConcurrentRuns: 0 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer tokensPerRun', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ok',
        name: 'Ok',
        limits: { tokensPerRun: 1.5 },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('dataResidency', () => {
    it('is optional — absent by default', () => {
      const result = parseWorkspaceConfig({ schemaVersion: 1, id: 'ws', name: 'WS' })
      expect(result.dataResidency).toBeUndefined()
    })

    it('accepts macro-region "eu" with pinned true', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'eu', pinned: true },
      })
      expect(result.dataResidency?.region).toBe('eu')
      expect(result.dataResidency?.pinned).toBe(true)
    })

    it('accepts macro-region "us" with pinned false default', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'us', pinned: false },
      })
      expect(result.dataResidency?.pinned).toBe(false)
    })

    it('defaults pinned to false when not provided', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'apac' },
      })
      expect(result.dataResidency?.pinned).toBe(false)
    })

    it('accepts ISO 3166-1 alpha-2 country code', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'de', pinned: true },
      })
      expect(result.dataResidency?.region).toBe('de')
    })

    it('accepts ISO 3166-1 alpha-3 country code', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'deu', pinned: false },
      })
      expect(result.dataResidency?.region).toBe('deu')
    })

    it('accepts exemptions list', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: {
          region: 'eu',
          pinned: true,
          exemptions: ['openai-adapter', 'gcs-tool'],
        },
      })
      expect(result.dataResidency?.exemptions).toEqual(['openai-adapter', 'gcs-tool'])
    })

    it('accepts empty exemptions array', () => {
      const result = parseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'us', pinned: true, exemptions: [] },
      })
      expect(result.dataResidency?.exemptions).toEqual([])
    })

    it('rejects region shorter than 2 chars', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'x', pinned: false },
      })
      expect(result.success).toBe(false)
    })

    it('rejects region longer than 8 chars', () => {
      const result = safeParseWorkspaceConfig({
        schemaVersion: 1,
        id: 'ws',
        name: 'WS',
        dataResidency: { region: 'toolongregion', pinned: false },
      })
      expect(result.success).toBe(false)
    })

    it('DataResidencyConfig schema parses standalone', () => {
      const r = DataResidencyConfig.safeParse({ region: 'global', pinned: true })
      expect(r.success).toBe(true)
    })
  })
})
