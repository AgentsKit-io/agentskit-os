import { describe, expect, it } from 'vitest'
import {
  AutomationRuleSet,
  matchAutomationRules,
} from '../src/automation-rules.js'

const event = (over: Partial<{ source: string; kind: string; receivedAt: number; payload: Record<string, unknown> }> = {}) => ({
  source: over.source ?? 'trigger.cron',
  kind: over.kind,
  receivedAt: over.receivedAt ?? 1_700_000_000_000,
  payload: over.payload ?? {},
})

describe('matchAutomationRules (#238)', () => {
  it('fires when source + kind match', () => {
    const set = AutomationRuleSet.parse({
      rules: [
        {
          id: 'cron-nightly',
          when: { source: 'trigger.cron', kind: 'nightly' },
          run: { flow: 'nightly-report' },
        },
      ],
    })
    const out = matchAutomationRules(set, event({ kind: 'nightly' }))
    expect(out).toHaveLength(1)
    expect(out[0]?.flow).toBe('nightly-report')
  })

  it('skips disabled rules', () => {
    const set = AutomationRuleSet.parse({
      rules: [
        {
          id: 'r',
          enabled: false,
          when: { source: 'trigger.cron' },
          run: { flow: 'f' },
        },
      ],
    })
    expect(matchAutomationRules(set, event())).toEqual([])
  })

  it('honors equality where filters', () => {
    const set = AutomationRuleSet.parse({
      rules: [
        {
          id: 'pr-merged',
          when: { source: 'github', kind: 'pull_request', where: { action: 'closed' } },
          run: { flow: 'on-merge' },
        },
      ],
    })
    expect(
      matchAutomationRules(set, event({ source: 'github', kind: 'pull_request', payload: { action: 'opened' } })),
    ).toEqual([])
    expect(
      matchAutomationRules(set, event({ source: 'github', kind: 'pull_request', payload: { action: 'closed' } })),
    ).toHaveLength(1)
  })

  it('respects cooldownMs via lastFiredAt ledger', () => {
    const set = AutomationRuleSet.parse({
      rules: [
        {
          id: 'cooldown',
          when: { source: 'trigger.cron' },
          run: { flow: 'f' },
          cooldownMs: 60_000,
        },
      ],
    })
    const ledger = new Map([['cooldown', 1_700_000_000_000 - 30_000]])
    expect(matchAutomationRules(set, event({ receivedAt: 1_700_000_000_000 }), ledger)).toEqual([])
  })

  it('renders inputTemplate with $.field references', () => {
    const set = AutomationRuleSet.parse({
      rules: [
        {
          id: 'forward',
          when: { source: 'webhook' },
          run: { flow: 'fan-out', inputTemplate: { user: '$.userId', literal: 'always' } },
        },
      ],
    })
    const out = matchAutomationRules(set, event({ source: 'webhook', payload: { userId: 'u-1' } }))
    expect(out[0]?.input).toEqual({ user: 'u-1', literal: 'always' })
  })
})
