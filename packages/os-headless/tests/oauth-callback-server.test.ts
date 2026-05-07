import { describe, expect, it } from 'vitest'
import { createOAuthHub, type OAuthConnection, type OAuthProvider } from '@agentskit/os-core'
import {
  createOAuthCallbackServer,
  type OAuthCallbackFetch,
  type PendingOAuthFlow,
} from '../src/oauth-callback-server.js'

const provider: OAuthProvider = {
  id: 'github',
  displayName: 'GitHub',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  defaultScopes: ['repo'],
}

const buildPending = (state: string, hubConn: OAuthConnection): PendingOAuthFlow => ({
  connection: hubConn,
  provider,
  redirectUri: 'http://127.0.0.1:9999/oauth/callback',
  clientId: 'test-client',
  clientSecret: 'test-secret',
})

const baseConn = (state: string): OAuthConnection => ({
  providerId: 'github',
  workspaceId: 'ws',
  state: 'authorizing',
  scopes: ['repo'],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastTransitionAt: '2026-01-01T00:00:00.000Z',
})

const fakeReqRes = (url: string) => {
  const headers: Record<string, string> = {}
  let status = 0
  let body = ''
  const req = { url } as unknown as import('node:http').IncomingMessage
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k] = v
    },
    end: (b: string) => {
      body = b
    },
    set statusCode(v: number) {
      status = v
    },
    get statusCode() {
      return status
    },
  } as unknown as import('node:http').ServerResponse
  return {
    req,
    res,
    state: () => ({ status, body, headers }),
  }
}

describe('createOAuthCallbackServer (Phase A-5)', () => {
  it('exchanges code, transitions to connected, captures token', async () => {
    const hub = createOAuthHub()
    hub.registerProvider(provider)
    const conn = baseConn('s1')
    const pending = buildPending('s1', conn)
    let connected: OAuthConnection | undefined
    let captured = ''
    const fetchImpl: OAuthCallbackFetch = async (_url, init) => {
      expect(init.body).toContain('code=abc123')
      return {
        status: 200,
        text: async () =>
          JSON.stringify({ access_token: 'tok-xyz', refresh_token: 'r1', expires_in: 3600 }),
      }
    }
    const server = createOAuthCallbackServer({
      hub,
      fetchImpl,
      getPending: (s) => (s === 's1' ? pending : undefined),
      onConnected: ({ connection, token }) => {
        connected = connection
        captured = token.accessToken
      },
    })
    const { req, res, state } = fakeReqRes('/oauth/callback?code=abc123&state=s1')
    await server.handle(req, res)
    expect(state().status).toBe(200)
    expect(connected?.state).toBe('connected')
    expect(captured).toBe('tok-xyz')
  })

  it('marks connection errored when callback contains error param', async () => {
    const hub = createOAuthHub()
    hub.registerProvider(provider)
    const pending = buildPending('s2', baseConn('s2'))
    let errMsg = ''
    const server = createOAuthCallbackServer({
      hub,
      getPending: () => pending,
      onConnected: () => undefined,
      onError: ({ message }) => {
        errMsg = message
      },
    })
    const { req, res, state } = fakeReqRes('/oauth/callback?error=access_denied&state=s2')
    await server.handle(req, res)
    expect(state().status).toBe(400)
    expect(errMsg).toBe('access_denied')
  })

  it('returns 400 on unknown state', async () => {
    const hub = createOAuthHub()
    const server = createOAuthCallbackServer({
      hub,
      getPending: () => undefined,
      onConnected: () => undefined,
    })
    const { req, res, state } = fakeReqRes('/oauth/callback?code=x&state=missing')
    await server.handle(req, res)
    expect(state().status).toBe(400)
  })

  it('marks connection errored when token endpoint returns >=400', async () => {
    const hub = createOAuthHub()
    hub.registerProvider(provider)
    const pending = buildPending('s3', baseConn('s3'))
    const fetchImpl: OAuthCallbackFetch = async () => ({
      status: 500,
      text: async () => 'bad',
    })
    let errCount = 0
    const server = createOAuthCallbackServer({
      hub,
      fetchImpl,
      getPending: () => pending,
      onConnected: () => undefined,
      onError: () => {
        errCount += 1
      },
    })
    const { req, res, state } = fakeReqRes('/oauth/callback?code=ok&state=s3')
    await server.handle(req, res)
    expect(state().status).toBe(502)
    expect(errCount).toBe(1)
  })

  it('start/stop binds an ephemeral port', async () => {
    const hub = createOAuthHub()
    const server = createOAuthCallbackServer({
      hub,
      getPending: () => undefined,
      onConnected: () => undefined,
    })
    const info = await server.start()
    expect(info.port).toBeGreaterThan(0)
    await server.stop()
  })
})
