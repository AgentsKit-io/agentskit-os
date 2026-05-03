import { describe, expect, it, vi } from 'vitest'
import { parseEgressPolicy } from '@agentskit/os-core'
import {
  PolicyEgressEnforcer,
  createFetchGuard,
  type EgressDecisionEvent,
} from '../src/index.js'

const mkPolicy = (overrides: Partial<Parameters<typeof parseEgressPolicy>[0] & object> = {}) =>
  parseEgressPolicy({
    mode: 'deny',
    allowlist: [
      'net:fetch:api.openai.com',
      'net:fetch:*.anthropic.com',
      'net:fetch:hooks.slack.com/services/*',
    ],
    pluginOverrides: { 'github-bot': ['net:fetch:api.github.com'] },
    ...overrides,
  })

describe('PolicyEgressEnforcer', () => {
  it('allows allowlisted host', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const d = enforcer.decide('https://api.openai.com/v1/chat')
    expect(d.kind).toBe('allow')
  })

  it('allows wildcard subdomain', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const d = enforcer.decide('https://api.anthropic.com/v1/messages')
    expect(d.kind).toBe('allow')
  })

  it('denies non-allowlisted host', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const d = enforcer.decide('https://evil.com/exfil')
    expect(d.kind).toBe('deny')
  })

  it('denies cloud metadata host via default blocklist', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const d = enforcer.decide('http://169.254.169.254/latest/meta-data')
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.reason).toContain('blocked by policy')
  })

  it('denies localhost via default blocklist', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const d = enforcer.decide('http://localhost:3000/admin')
    expect(d.kind).toBe('deny')
  })

  it('honors plugin override', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const blocked = enforcer.decide('https://api.github.com/repos')
    expect(blocked.kind).toBe('deny')
    const allowed = enforcer.decide('https://api.github.com/repos', {
      pluginId: 'github-bot',
    })
    expect(allowed.kind).toBe('allow')
  })

  it('mode=allow lets unknown hosts through but still respects blocklist', () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy({ mode: 'allow' }))
    expect(enforcer.decide('https://evil.com/x').kind).toBe('allow')
    expect(enforcer.decide('https://localhost/x').kind).toBe('deny')
  })
})

describe('createFetchGuard', () => {
  it('forwards allowed requests to the wrapped fetch', async () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const realFetch = vi.fn(async () => new Response('ok'))
    const events: EgressDecisionEvent[] = []
    const guarded = createFetchGuard({
      enforcer,
      fetch: realFetch as unknown as typeof fetch,
      onDecision: (e) => events.push(e),
    })
    const r = await guarded('https://api.openai.com/v1/chat')
    expect(await r.text()).toBe('ok')
    expect(realFetch).toHaveBeenCalledOnce()
    expect(events[0]).toMatchObject({ kind: 'allowed' })
  })

  it('throws on denied requests without invoking the wrapped fetch', async () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const realFetch = vi.fn(async () => new Response('never'))
    const events: EgressDecisionEvent[] = []
    const guarded = createFetchGuard({
      enforcer,
      fetch: realFetch as unknown as typeof fetch,
      onDecision: (e) => events.push(e),
    })
    await expect(guarded('https://evil.com/x')).rejects.toThrow(/egress denied/)
    expect(realFetch).not.toHaveBeenCalled()
    expect(events[0]).toMatchObject({ kind: 'denied' })
  })

  it('attaches pluginId to decision events', async () => {
    const enforcer = new PolicyEgressEnforcer(mkPolicy())
    const events: EgressDecisionEvent[] = []
    const guarded = createFetchGuard({
      enforcer,
      fetch: (async () => new Response('ok')) as unknown as typeof fetch,
      pluginId: 'github-bot',
      onDecision: (e) => events.push(e),
    })
    await guarded('https://api.github.com/repos')
    expect(events[0]).toMatchObject({ kind: 'allowed', pluginId: 'github-bot' })
  })

})
