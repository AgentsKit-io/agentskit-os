import { describe, expect, it } from 'vitest'
import {
  airGapEnforce,
  parseAirGapPolicy,
  safeParseAirGapPolicy,
  type AirGapDecision,
  type AirGapPolicy,
} from '../../src/security/airgap.js'

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

const openPolicy: AirGapPolicy = parseAirGapPolicy({ airGapped: false })
const airGappedBase: AirGapPolicy = parseAirGapPolicy({ airGapped: true })
const airGappedWithLocal: AirGapPolicy = parseAirGapPolicy({
  airGapped: true,
  localProviders: ['ollama', 'llama-cpp'],
})

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('AirGapPolicy schema', () => {
  it('defaults to non-air-gapped', () => {
    const p = parseAirGapPolicy({})
    expect(p.airGapped).toBe(false)
    expect(p.localProviders).toEqual([])
  })

  it('accepts explicit air-gapped with localProviders', () => {
    const p = parseAirGapPolicy({ airGapped: true, localProviders: ['ollama'] })
    expect(p.localProviders).toContain('ollama')
  })

  it('rejects invalid structure', () => {
    expect(safeParseAirGapPolicy({ airGapped: 'yes' }).success).toBe(false)
  })

  it('rejects too many localProviders', () => {
    const tooMany = Array.from({ length: 65 }, (_, i) => `provider-${i}`)
    expect(safeParseAirGapPolicy({ airGapped: true, localProviders: tooMany }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Non-air-gapped mode: everything allows
// ---------------------------------------------------------------------------

describe('airGapEnforce — not air-gapped', () => {
  it('allows telemetry', () => {
    const d = airGapEnforce(openPolicy, { kind: 'telemetry' })
    expect(d.allow).toBe(true)
  })

  it('allows marketplace', () => {
    const d = airGapEnforce(openPolicy, { kind: 'marketplace' })
    expect(d.allow).toBe(true)
  })

  it('allows cloudSync', () => {
    const d = airGapEnforce(openPolicy, { kind: 'cloudSync' })
    expect(d.allow).toBe(true)
  })

  it('allows externalLlm', () => {
    const d = airGapEnforce(openPolicy, { kind: 'externalLlm', provider: 'openai' })
    expect(d.allow).toBe(true)
  })

  it('allows egress to public host', () => {
    const d = airGapEnforce(openPolicy, { kind: 'egress', host: 'api.example.com' })
    expect(d.allow).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Air-gapped mode: categorical denials
// ---------------------------------------------------------------------------

describe('airGapEnforce — air-gapped, categorical denials', () => {
  const assertDeny = (d: AirGapDecision) => {
    expect(d.allow).toBe(false)
    if (!d.allow) expect(d.code).toBe('os.security.airgap_blocked')
  }

  it('denies telemetry', () => {
    assertDeny(airGapEnforce(airGappedBase, { kind: 'telemetry' }))
  })

  it('denies marketplace', () => {
    assertDeny(airGapEnforce(airGappedBase, { kind: 'marketplace' }))
  })

  it('denies cloudSync', () => {
    assertDeny(airGapEnforce(airGappedBase, { kind: 'cloudSync' }))
  })
})

// ---------------------------------------------------------------------------
// Air-gapped mode: externalLlm
// ---------------------------------------------------------------------------

describe('airGapEnforce — air-gapped externalLlm', () => {
  it('denies unknown provider', () => {
    const d = airGapEnforce(airGappedBase, { kind: 'externalLlm', provider: 'openai' })
    expect(d.allow).toBe(false)
    if (!d.allow) expect(d.code).toBe('os.security.airgap_blocked')
  })

  it('allows provider in localProviders list', () => {
    const d = airGapEnforce(airGappedWithLocal, { kind: 'externalLlm', provider: 'ollama' })
    expect(d.allow).toBe(true)
  })

  it('matches provider case-insensitively', () => {
    const d = airGapEnforce(airGappedWithLocal, { kind: 'externalLlm', provider: 'Ollama' })
    expect(d.allow).toBe(true)
  })

  it('denies provider not in list even if list is non-empty', () => {
    const d = airGapEnforce(airGappedWithLocal, { kind: 'externalLlm', provider: 'anthropic' })
    expect(d.allow).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Air-gapped mode: egress
// ---------------------------------------------------------------------------

describe('airGapEnforce — air-gapped egress', () => {
  it('allows localhost', () => {
    expect(airGapEnforce(airGappedBase, { kind: 'egress', host: 'localhost' }).allow).toBe(true)
  })

  it('allows 127.0.0.1', () => {
    expect(airGapEnforce(airGappedBase, { kind: 'egress', host: '127.0.0.1' }).allow).toBe(true)
  })

  it('allows ::1', () => {
    expect(airGapEnforce(airGappedBase, { kind: 'egress', host: '::1' }).allow).toBe(true)
  })

  it('denies public host', () => {
    const d = airGapEnforce(airGappedBase, { kind: 'egress', host: 'api.openai.com' })
    expect(d.allow).toBe(false)
    if (!d.allow) {
      expect(d.code).toBe('os.security.airgap_blocked')
      expect(d.reason).toMatch(/egress/)
    }
  })

  it('denies internal host (not loopback)', () => {
    const d = airGapEnforce(airGappedBase, { kind: 'egress', host: '10.0.0.1' })
    expect(d.allow).toBe(false)
  })
})
