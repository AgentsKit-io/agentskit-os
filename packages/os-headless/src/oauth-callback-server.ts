import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { OAuthConnection, OAuthHubRegistry, OAuthProvider } from '@agentskit/os-core'

export type OAuthCallbackFetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<{ status: number; text: () => Promise<string> }>

export type OAuthTokenResult = {
  readonly accessToken: string
  readonly refreshToken?: string
  readonly expiresIn?: number
  readonly raw: Record<string, unknown>
}

export type PendingOAuthFlow = {
  readonly connection: OAuthConnection
  readonly provider: OAuthProvider
  readonly redirectUri: string
  readonly clientId: string
  readonly clientSecret: string
}

export type OAuthCallbackServerOpts = {
  readonly host?: string
  readonly port?: number
  readonly path?: string
  readonly hub: OAuthHubRegistry
  readonly fetchImpl?: OAuthCallbackFetch
  readonly getPending: (state: string) => PendingOAuthFlow | undefined
  readonly onConnected: (args: {
    connection: OAuthConnection
    token: OAuthTokenResult
  }) => Promise<void> | void
  readonly onError?: (args: {
    state: string
    connection?: OAuthConnection
    message: string
  }) => Promise<void> | void
}

export type OAuthCallbackServer = {
  readonly start: () => Promise<{ url: string; port: number }>
  readonly stop: () => Promise<void>
  readonly handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>
}

const defaultFetch: OAuthCallbackFetch = async (url, init) => {
  const r = await fetch(url, init)
  return { status: r.status, text: async () => r.text() }
}

const closingHtml = (msg: string) =>
  `<!doctype html><meta charset="utf-8"><title>AgentsKitOS</title>` +
  `<body style="font-family:system-ui;padding:32px;max-width:520px;margin:auto;">` +
  `<h2>${msg}</h2><p>You can close this tab.</p></body>`

const writeHtml = (res: ServerResponse, status: number, body: string) => {
  res.statusCode = status
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(body)
}

const parseQuery = (rawUrl: string): { path: string; params: URLSearchParams } => {
  const u = new URL(rawUrl, 'http://callback.local')
  return { path: u.pathname, params: u.searchParams }
}

const exchangeCode = async (args: {
  pending: PendingOAuthFlow
  code: string
  fetchImpl: OAuthCallbackFetch
}): Promise<OAuthTokenResult> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.pending.redirectUri,
    client_id: args.pending.clientId,
    client_secret: args.pending.clientSecret,
  }).toString()
  const resp = await args.fetchImpl(args.pending.provider.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  })
  const text = await resp.text()
  if (resp.status >= 400) {
    throw new Error(`token exchange failed: HTTP ${resp.status}: ${text}`)
  }
  const json = JSON.parse(text) as Record<string, unknown>
  const accessToken = json['access_token']
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('token exchange response missing access_token')
  }
  const refresh = json['refresh_token']
  const expires = json['expires_in']
  const out: OAuthTokenResult = { accessToken, raw: json }
  if (typeof refresh === 'string') (out as { refreshToken?: string }).refreshToken = refresh
  if (typeof expires === 'number') (out as { expiresIn?: number }).expiresIn = expires
  return out
}

export const createOAuthCallbackServer = (
  opts: OAuthCallbackServerOpts,
): OAuthCallbackServer => {
  const path = opts.path ?? '/oauth/callback'
  const fetchImpl = opts.fetchImpl ?? defaultFetch
  const host = opts.host ?? '127.0.0.1'
  const listenPort = opts.port ?? 0
  let server: Server | null = null

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = req.url ?? '/'
    const { path: reqPath, params } = parseQuery(url)
    if (reqPath !== path) {
      writeHtml(res, 404, closingHtml('Not found'))
      return
    }
    const state = params.get('state') ?? ''
    const code = params.get('code')
    const errorParam = params.get('error')
    const pending = opts.getPending(state)
    if (pending === undefined) {
      await opts.onError?.({ state, message: 'no pending oauth flow for state' })
      writeHtml(res, 400, closingHtml('Unknown OAuth state'))
      return
    }
    if (errorParam !== null && errorParam.length > 0) {
      const errored = opts.hub.transition(pending.connection, 'errored', {
        errorMessage: errorParam,
      })
      await opts.onError?.({ state, connection: errored, message: errorParam })
      writeHtml(res, 400, closingHtml(`OAuth error: ${errorParam}`))
      return
    }
    if (code === null || code.length === 0) {
      const errored = opts.hub.transition(pending.connection, 'errored', {
        errorMessage: 'missing code',
      })
      await opts.onError?.({ state, connection: errored, message: 'missing code' })
      writeHtml(res, 400, closingHtml('OAuth callback missing code'))
      return
    }
    try {
      const token = await exchangeCode({ pending, code, fetchImpl })
      const connected = opts.hub.transition(pending.connection, 'connected')
      await opts.onConnected({ connection: connected, token })
      writeHtml(res, 200, closingHtml(`Connected to ${pending.provider.displayName}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const errored = opts.hub.transition(pending.connection, 'errored', { errorMessage: message })
      await opts.onError?.({ state, connection: errored, message })
      writeHtml(res, 502, closingHtml(`OAuth exchange failed: ${message}`))
    }
  }

  return {
    handle,
    start: () =>
      new Promise((resolve, reject) => {
        const s = createServer((req, res) => {
          handle(req, res).catch((err) => {
            res.statusCode = 500
            res.end(String(err))
          })
        })
        s.once('error', reject)
        s.listen(listenPort, host, () => {
          const addr = s.address()
          const port = addr !== null && typeof addr === 'object' ? addr.port : 0
          server = s
          resolve({ url: `http://${host}:${port}${path}`, port })
        })
      }),
    stop: () =>
      new Promise((resolve) => {
        if (server === null) {
          resolve()
          return
        }
        server.close(() => {
          server = null
          resolve()
        })
      }),
  }
}
