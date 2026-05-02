import { describe, expect, it } from 'vitest'
import {
  checkEgress,
  parseEgressPolicy,
  safeParseEgressPolicy,
  type EgressPolicy,
} from '../../src/security/egress.js'

const policy = (over: Partial<EgressPolicy> = {}): EgressPolicy =>
  parseEgressPolicy({ mode: 'deny', ...over })

describe('EgressPolicy schema', () => {
  it('parses minimal policy with default-deny', () => {
    const p = parseEgressPolicy({})
    expect(p.mode).toBe('deny')
    expect(p.blocklist.length).toBeGreaterThan(0)
  })

  it('rejects bare wildcard "net:fetch:*"', () => {
    expect(safeParseEgressPolicy({ allowlist: ['net:fetch:*'] }).success).toBe(false)
  })

  it('rejects malformed grant', () => {
    expect(safeParseEgressPolicy({ allowlist: ['http://x.com'] }).success).toBe(false)
  })

  it('accepts proxy with vault mtls cert', () => {
    const p = parseEgressPolicy({
      proxy: { url: 'https://corp-proxy:3128', mtlsCert: '${vault:proxy_cert}' },
    })
    expect(p.proxy?.url).toBe('https://corp-proxy:3128')
  })
})

describe('checkEgress', () => {
  it('denies by default', () => {
    const d = checkEgress(policy(), 'net:fetch:api.openai.com')
    expect(d.kind).toBe('deny')
  })

  it('allows exact-host allowlist', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:api.openai.com'] }),
      'net:fetch:api.openai.com',
    )
    expect(d.kind).toBe('allow')
  })

  it('allows wildcard subdomain', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:*.anthropic.com'] }),
      'net:fetch:api.anthropic.com',
    )
    expect(d.kind).toBe('allow')
  })

  it('does not match parent domain via wildcard', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:*.anthropic.com'] }),
      'net:fetch:anthropic.com',
    )
    expect(d.kind).toBe('deny')
  })

  it('allows path-prefix wildcard', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:hooks.slack.com/services/*'] }),
      'net:fetch:hooks.slack.com/services/T1/B2/xxx',
    )
    expect(d.kind).toBe('allow')
  })

  it('blocks cloud metadata endpoint even if allowlisted', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:169.254.169.254'] }),
      'net:fetch:169.254.169.254',
    )
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.reason).toContain('blocked')
  })

  it('blocks localhost', () => {
    const d = checkEgress(policy({ allowlist: ['net:fetch:localhost'] }), 'net:fetch:localhost')
    expect(d.kind).toBe('deny')
  })

  it('blocks port-wildcard match', () => {
    const d = checkEgress(policy(), 'net:connect:169.254.169.254:80')
    expect(d.kind).toBe('deny')
  })

  it('mode=allow lets through anything not blocklisted', () => {
    const d = checkEgress(policy({ mode: 'allow' }), 'net:fetch:api.openai.com')
    expect(d.kind).toBe('allow')
  })

  it('mode=allow still honors blocklist', () => {
    const d = checkEgress(policy({ mode: 'allow' }), 'net:fetch:127.0.0.1')
    expect(d.kind).toBe('deny')
  })

  it('respects pluginOverrides', () => {
    const d = checkEgress(
      policy({ pluginOverrides: { 'gh-bot': ['net:fetch:api.github.com'] } }),
      'net:fetch:api.github.com',
      'gh-bot',
    )
    expect(d.kind).toBe('allow')
  })

  it('does not apply other plugin overrides', () => {
    const d = checkEgress(
      policy({ pluginOverrides: { 'gh-bot': ['net:fetch:api.github.com'] } }),
      'net:fetch:api.github.com',
      'other-plugin',
    )
    expect(d.kind).toBe('deny')
  })

  it('rejects malformed request grant', () => {
    const d = checkEgress(policy({ allowlist: ['net:fetch:api.openai.com'] }), 'not-a-grant')
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.reason).toContain('malformed')
  })

  it('matches "any" host wildcard for opt-in unlimited', () => {
    const d = checkEgress(policy({ allowlist: ['net:fetch:any'] }), 'net:fetch:wherever.com')
    expect(d.kind).toBe('allow')
  })

  it('does not allow wrong op (fetch vs connect)', () => {
    const d = checkEgress(
      policy({ allowlist: ['net:fetch:api.openai.com'] }),
      'net:connect:api.openai.com:443',
    )
    expect(d.kind).toBe('deny')
  })
})
