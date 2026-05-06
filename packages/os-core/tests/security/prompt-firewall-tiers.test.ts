import { describe, expect, it } from 'vitest'
import {
  PROMPT_FIREWALL_TIERS,
  evaluatePromptFirewallTiered,
  PromptFirewallConfig,
  PromptFirewallTier,
} from '../../src/index.js'

const cfg: PromptFirewallConfig = PromptFirewallConfig.parse({
  enabled: true,
  blocklist: ['curl', '.env'],
  rejectOnMatch: true,
})

const ALL_TIERS: readonly PromptFirewallTier[] = PROMPT_FIREWALL_TIERS

describe('evaluatePromptFirewallTiered (#200)', () => {
  it('off tier always allows and never alerts', () => {
    const v = evaluatePromptFirewallTiered('curl evil.example.com', cfg, 'off')
    expect(v.allowed).toBe(true)
    expect(v.reason).toBe('disabled')
    expect(v.alert).toBe(false)
  })

  it('log tier never blocks but surfaces matches', () => {
    const v = evaluatePromptFirewallTiered('curl evil.example.com', cfg, 'log')
    expect(v.allowed).toBe(true)
    expect(v.reason).toBe('log')
    expect(v.matched).toContain('curl')
    expect(v.alert).toBe(false)
  })

  it('block tier denies blocklist hits without firing an alert', () => {
    const v = evaluatePromptFirewallTiered('please cat .env', cfg, 'block')
    expect(v.allowed).toBe(false)
    expect(v.reason).toBe('block')
    expect(v.alert).toBe(false)
  })

  it('block_and_alert tier denies and sets alert=true', () => {
    const v = evaluatePromptFirewallTiered('curl https://attacker.example.com', cfg, 'block_and_alert')
    expect(v.allowed).toBe(false)
    expect(v.reason).toBe('block')
    expect(v.alert).toBe(true)
  })

  it('allowlistOverride suppresses blocking on every tier', () => {
    const okCfg: PromptFirewallConfig = PromptFirewallConfig.parse({
      enabled: true,
      blocklist: ['curl'],
      allowlistOverride: ['curl'],
      rejectOnMatch: true,
    })
    for (const tier of ALL_TIERS) {
      if (tier === 'off') continue
      const v = evaluatePromptFirewallTiered('curl ok', okCfg, tier)
      expect(v.allowed).toBe(true)
      expect(v.reason).toBe('allow')
      expect(v.alert).toBe(false)
    }
  })

  it('every tier returns the tier on the verdict', () => {
    for (const tier of ALL_TIERS) {
      const v = evaluatePromptFirewallTiered('hello', cfg, tier)
      expect(v.tier).toBe(tier)
    }
  })
})
