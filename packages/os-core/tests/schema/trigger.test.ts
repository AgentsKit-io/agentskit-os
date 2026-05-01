import { describe, expect, it } from 'vitest'
import {
  parseTriggerConfig,
  safeParseTriggerConfig,
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
})
