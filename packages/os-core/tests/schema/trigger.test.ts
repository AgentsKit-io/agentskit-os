import { describe, expect, it } from 'vitest'
import {
  parseTriggerConfig,
  safeParseTriggerConfig,
  effectiveLimitsFor,
} from '../../src/schema/trigger.js'

const base = { id: 'daily-pr', name: 'Daily PR', flow: 'pr-review' }

describe('TriggerConfig — discriminated union', () => {
  describe('cron', () => {
    it('accepts valid cron', () => {
      const t = parseTriggerConfig({ ...base, kind: 'cron', cron: '0 9 * * *', timezone: 'UTC' })
      expect(t.kind).toBe('cron')
      expect(t.enabled).toBe(true)
    })
    it('rejects empty cron', () => {
      expect(safeParseTriggerConfig({ ...base, kind: 'cron', cron: '' }).success).toBe(false)
    })
  })

  describe('webhook', () => {
    it('accepts valid path', () => {
      const t = parseTriggerConfig({
        ...base,
        kind: 'webhook',
        path: '/hooks/github',
        secret: '${vault:gh_secret}',
      })
      expect(t.kind === 'webhook' && t.method).toBe('POST')
    })
    it('rejects path missing leading slash', () => {
      expect(
        safeParseTriggerConfig({ ...base, kind: 'webhook', path: 'hooks/x' }).success,
      ).toBe(false)
    })
    it('rejects invalid HTTP method', () => {
      expect(
        safeParseTriggerConfig({ ...base, kind: 'webhook', path: '/x', method: 'OPTIONS' }).success,
      ).toBe(false)
    })
  })

  describe('file', () => {
    it('accepts default events', () => {
      const t = parseTriggerConfig({ ...base, kind: 'file', path: '/var/inbox' })
      expect(t.kind === 'file' && t.events).toEqual(['add', 'change'])
    })
    it('rejects empty events array', () => {
      expect(
        safeParseTriggerConfig({ ...base, kind: 'file', path: '/x', events: [] }).success,
      ).toBe(false)
    })
  })

  describe('email', () => {
    it('accepts mailbox', () => {
      const t = parseTriggerConfig({ ...base, kind: 'email', mailbox: 'team@x.com' })
      expect(t.kind).toBe('email')
    })
  })

  describe('slack', () => {
    it('defaults event to message', () => {
      const t = parseTriggerConfig({ ...base, kind: 'slack', channel: 'C123' })
      expect(t.kind === 'slack' && t.event).toBe('message')
    })
  })

  describe('github', () => {
    it('accepts owner/repo', () => {
      const t = parseTriggerConfig({
        ...base,
        kind: 'github',
        repo: 'AgentsKit-io/agentskit-os',
        event: 'pull_request',
      })
      expect(t.kind).toBe('github')
    })
    it('rejects malformed repo', () => {
      expect(
        safeParseTriggerConfig({ ...base, kind: 'github', repo: 'bad', event: 'push' }).success,
      ).toBe(false)
    })
  })

  describe('linear', () => {
    it('parses default event', () => {
      const t = parseTriggerConfig({ ...base, kind: 'linear', team: 'ENG' })
      expect(t.kind === 'linear' && t.event).toBe('issue.create')
    })
  })

  describe('cdc', () => {
    it('accepts postgres CDC with vault connection', () => {
      const t = parseTriggerConfig({
        ...base,
        kind: 'cdc',
        source: 'postgres',
        connection: '${vault:pg_url}',
        table: 'orders',
      })
      expect(t.kind === 'cdc' && t.operations).toEqual(['insert'])
    })
    it('rejects unknown source', () => {
      expect(
        safeParseTriggerConfig({
          ...base,
          kind: 'cdc',
          source: 'mongo',
          connection: 'x',
          table: 'orders',
        }).success,
      ).toBe(false)
    })
  })

  describe('discriminator', () => {
    it('rejects unknown kind', () => {
      expect(safeParseTriggerConfig({ ...base, kind: 'sms' }).success).toBe(false)
    })
    it('rejects missing kind', () => {
      expect(safeParseTriggerConfig({ ...base }).success).toBe(false)
    })
    it('throws on parseTriggerConfig with invalid input', () => {
      expect(() => parseTriggerConfig({})).toThrow()
    })
  })

  describe('per-trigger limits field', () => {
    it('accepts a cron trigger with a limits block', () => {
      const t = parseTriggerConfig({
        ...base,
        kind: 'cron',
        cron: '0 6 * * *',
        limits: { usdPerRun: 2.5, maxStepsPerRun: 500 },
      })
      expect(t.limits?.usdPerRun).toBe(2.5)
      expect(t.limits?.maxStepsPerRun).toBe(500)
    })

    it('limits is optional — absent by default', () => {
      const t = parseTriggerConfig({ ...base, kind: 'cron', cron: '0 9 * * *' })
      expect(t.limits).toBeUndefined()
    })

    it('rejects negative usdPerRun in trigger limits', () => {
      expect(
        safeParseTriggerConfig({
          ...base,
          kind: 'cron',
          cron: '0 9 * * *',
          limits: { usdPerRun: -1 },
        }).success,
      ).toBe(false)
    })
  })
})

describe('effectiveLimitsFor', () => {
  it('returns empty object when both workspace and trigger are undefined', () => {
    const result = effectiveLimitsFor({})
    expect(result.usdPerRun).toBeUndefined()
    expect(result.tokensPerRun).toBeUndefined()
  })

  it('returns workspace limits when no trigger override is set', () => {
    const result = effectiveLimitsFor({
      workspace: { usdPerRun: 10, maxStepsPerRun: 1000 },
    })
    expect(result.usdPerRun).toBe(10)
    expect(result.maxStepsPerRun).toBe(1000)
  })

  it('trigger override wins over workspace for usdPerRun', () => {
    const result = effectiveLimitsFor({
      workspace: { usdPerRun: 10, tokensPerRun: 50_000 },
      trigger: { usdPerRun: 2 },
    })
    expect(result.usdPerRun).toBe(2)
    // workspace value inherited for unoverridden field
    expect(result.tokensPerRun).toBe(50_000)
  })

  it('partial trigger override inherits remaining workspace fields', () => {
    const result = effectiveLimitsFor({
      workspace: {
        usdPerRun: 5,
        tokensPerDay: 1_000_000,
        maxConcurrentRuns: 4,
      },
      trigger: { maxConcurrentRuns: 1 },
    })
    expect(result.maxConcurrentRuns).toBe(1)
    expect(result.usdPerRun).toBe(5)
    expect(result.tokensPerDay).toBe(1_000_000)
  })

  it('full trigger override replaces all workspace fields', () => {
    const workspace = {
      tokensPerRun: 100_000,
      usdPerRun: 5,
      tokensPerDay: 1_000_000,
      usdPerDay: 50,
      wallClockMsPerRun: 60_000,
      maxConcurrentRuns: 10,
      maxStepsPerRun: 1_000,
    }
    const trigger = {
      tokensPerRun: 10_000,
      usdPerRun: 0.5,
      tokensPerDay: 100_000,
      usdPerDay: 5,
      wallClockMsPerRun: 30_000,
      maxConcurrentRuns: 2,
      maxStepsPerRun: 100,
    }
    const result = effectiveLimitsFor({ workspace, trigger })
    expect(result.tokensPerRun).toBe(10_000)
    expect(result.usdPerRun).toBe(0.5)
    expect(result.tokensPerDay).toBe(100_000)
    expect(result.usdPerDay).toBe(5)
    expect(result.wallClockMsPerRun).toBe(30_000)
    expect(result.maxConcurrentRuns).toBe(2)
    expect(result.maxStepsPerRun).toBe(100)
  })

  it('trigger-only (no workspace) returns trigger values', () => {
    const result = effectiveLimitsFor({
      trigger: { usdPerRun: 3, maxStepsPerRun: 200 },
    })
    expect(result.usdPerRun).toBe(3)
    expect(result.maxStepsPerRun).toBe(200)
    expect(result.tokensPerRun).toBeUndefined()
  })
})
