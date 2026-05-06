import { describe, expect, it } from 'vitest'
import { createOAuthHub, type OAuthConnection } from '../../src/index.js'

const slack = {
  id: 'slack',
  displayName: 'Slack',
  authorizationUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  defaultScopes: ['chat:write', 'channels:read'],
}

const conn = (over: Partial<OAuthConnection> = {}): OAuthConnection => ({
  providerId: 'slack',
  workspaceId: 'ws',
  state: 'pending',
  scopes: [],
  createdAt: '2026-05-06T00:00:00Z',
  lastTransitionAt: '2026-05-06T00:00:00Z',
  ...over,
})

describe('createOAuthHub (#81)', () => {
  it('register + listProviders dedups', () => {
    const h = createOAuthHub()
    expect(h.registerProvider(slack)).toBe('registered')
    expect(h.registerProvider(slack)).toBe('conflict')
    expect(h.listProviders().map((p) => p.id)).toEqual(['slack'])
  })

  it('buildAuthorizeUrl emits client_id + redirect_uri + state + scopes', () => {
    const h = createOAuthHub()
    h.registerProvider(slack)
    const url = h.buildAuthorizeUrl('slack', {
      redirectUri: 'https://app.example.com/callback',
      state: 'csrf-1',
    })
    expect(url).toContain('https://slack.com/oauth/v2/authorize?')
    expect(url).toContain('client_id=slack')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback')
    expect(url).toContain('state=csrf-1')
    expect(url).toContain('scope=chat%3Awrite%20channels%3Aread')
  })

  it('transition enforces the allowed graph', () => {
    const h = createOAuthHub()
    const c = conn({ state: 'pending' })
    const authorizing = h.transition(c, 'authorizing', { at: '2026-05-06T00:00:01Z' })
    expect(authorizing.state).toBe('authorizing')
    const connected = h.transition(authorizing, 'connected', { at: '2026-05-06T00:00:02Z' })
    expect(connected.state).toBe('connected')
    expect(() => h.transition(connected, 'pending')).toThrow(/not allowed/)
  })
})
