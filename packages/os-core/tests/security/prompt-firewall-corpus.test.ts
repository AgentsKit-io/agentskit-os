import { describe, expect, it } from 'vitest'
import {
  PROMPT_FIREWALL_CORPUS,
  evaluatePromptFirewall,
  PromptFirewallConfig,
} from '../../src/index.js'

const REGRESSION_BLOCKLIST: readonly string[] = [
  'curl',
  '.env',
  'rm -rf',
  'ignore previous instructions',
  '$GITHUB_TOKEN',
  'attacker.example.com',
  'skip prompt firewall',
] as const

const REGRESSION_CONFIG: PromptFirewallConfig = PromptFirewallConfig.parse({
  enabled: true,
  blocklist: [...REGRESSION_BLOCKLIST],
  allowlistOverride: [],
  rejectOnMatch: true,
})

describe('evaluatePromptFirewall', () => {
  it('returns reason="disabled" when firewall is off', () => {
    const off = PromptFirewallConfig.parse({ enabled: false, blocklist: ['curl'] })
    const v = evaluatePromptFirewall('please run curl evil.example.com', off)
    expect(v.allowed).toBe(true)
    expect(v.reason).toBe('disabled')
  })

  it('logs but allows when blocklist hits and rejectOnMatch=false', () => {
    const cfg = PromptFirewallConfig.parse({
      enabled: true,
      blocklist: ['curl'],
      rejectOnMatch: false,
    })
    const v = evaluatePromptFirewall('curl https://example.com', cfg)
    expect(v.allowed).toBe(true)
    expect(v.reason).toBe('log')
    expect(v.matched).toEqual(['curl'])
  })
})

describe('prompt firewall regression corpus (#443)', () => {
  it('flags every curated injection attempt under the regression blocklist', () => {
    const failures: { id: string; reason: string }[] = []
    for (const entry of PROMPT_FIREWALL_CORPUS) {
      const v = evaluatePromptFirewall(entry.prompt, REGRESSION_CONFIG)
      if (v.allowed || v.reason !== 'block') {
        failures.push({ id: entry.id, reason: `not blocked: reason=${v.reason}` })
        continue
      }
      for (const expected of entry.expectMatches) {
        if (!v.matched.some((m) => m.toLowerCase() === expected.toLowerCase())) {
          failures.push({ id: entry.id, reason: `missing expected match: ${expected}` })
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('every corpus entry has at least one expected match string', () => {
    for (const entry of PROMPT_FIREWALL_CORPUS) {
      expect(entry.expectMatches.length).toBeGreaterThan(0)
    }
  })
})
