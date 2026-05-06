// Regression suite for the workspace egress policy (#438).
// Two goals:
// 1. Lock in default-deny semantics — any new code path that loosens defaults
//    must update this corpus explicitly.
// 2. Detect allowlist drift — the curated `EXPECTED_BLOCKLIST` must remain a
//    subset of the default policy blocklist.

import { describe, expect, it } from 'vitest'
import { EgressPolicy, checkEgress } from '../../src/index.js'

const DEFAULT_DENY_VECTORS: readonly string[] = [
  'net:fetch:metadata.google.internal',
  'net:fetch:169.254.169.254',
  'net:fetch:127.0.0.1',
  'net:fetch:localhost',
  'net:connect:169.254.169.254:80',
  'net:fetch:::1',
  'net:fetch:0.0.0.0',
  'net:fetch:api.openai.com',
  'net:fetch:attacker.example.com',
] as const

const EXPECTED_BLOCKLIST: readonly string[] = [
  'net:fetch:metadata.google.internal',
  'net:connect:169.254.169.254:*',
  'net:fetch:169.254.169.254',
  'net:fetch:localhost',
  'net:fetch:127.0.0.1',
  'net:fetch:::1',
  'net:fetch:0.0.0.0',
] as const

describe('egress policy default-deny regression (#438)', () => {
  const policy = EgressPolicy.parse({})

  it('starts in deny mode with empty allowlist', () => {
    expect(policy.mode).toBe('deny')
    expect(policy.allowlist).toEqual([])
  })

  for (const grant of DEFAULT_DENY_VECTORS) {
    it(`denies "${grant}"`, () => {
      const decision = checkEgress(policy, grant)
      expect(decision.kind).toBe('deny')
    })
  }

  it('rejects bare wildcard "net:fetch:*" at parse time', () => {
    const r = EgressPolicy.safeParse({ allowlist: ['net:fetch:*'] })
    expect(r.success).toBe(false)
  })
})

describe('egress allowlist drift detector (#438)', () => {
  const policy = EgressPolicy.parse({})

  it('default blocklist includes every curated metadata-server entry', () => {
    const missing = EXPECTED_BLOCKLIST.filter((g) => !policy.blocklist.includes(g))
    expect(missing).toEqual([])
  })

  it('blocklist hits win over allowlist (defense in depth)', () => {
    const compromised = EgressPolicy.parse({
      allowlist: ['net:fetch:169.254.169.254'],
    })
    const decision = checkEgress(compromised, 'net:fetch:169.254.169.254')
    expect(decision.kind).toBe('deny')
  })

  it('explicit "net:fetch:any" still requires opt-in via allowlist', () => {
    const decision = checkEgress(policy, 'net:fetch:any')
    expect(decision.kind).toBe('deny')
    const opt = EgressPolicy.parse({ allowlist: ['net:fetch:any'] })
    const decision2 = checkEgress(opt, 'net:fetch:example.com')
    expect(decision2.kind).toBe('allow')
  })
})
