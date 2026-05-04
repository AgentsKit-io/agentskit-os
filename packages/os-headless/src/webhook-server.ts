import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { HeadlessRunner } from './runner.js'
import type { VaultSecretRef, WebhookTrigger } from '@agentskit/os-core'
import { signWebhookRequest, verifyWebhookRequest } from '@agentskit/os-core'

export type WebhookSecret = string | VaultSecretRef

export type WebhookSecretResolver = (ref: VaultSecretRef) => Promise<string>

export type WebhookServerOptions = {
  /**
   * Webhook triggers to expose.
   * Caller is responsible for de-duplicating paths.
   */
  readonly triggers: readonly WebhookTrigger[]
  /** Runner used to execute the configured flow. */
  readonly runner: HeadlessRunner
  /**
   * Optional resolver for VaultSecretRef secrets.
   * If a trigger uses a VaultSecretRef and no resolver is provided, requests will be rejected.
   */
  readonly resolveSecret?: WebhookSecretResolver
}

export type WebhookServer = {
  listen(opts?: { port?: number; host?: string }): Promise<{ port: number; host: string }>
  close(): Promise<void>
}

const readBody = async (req: IncomingMessage, limitBytes = 1_000_000): Promise<string> => {
  const chunks: Buffer[] = []
  let total = 0
  for await (const c of req) {
    const b = typeof c === 'string' ? Buffer.from(c) : Buffer.from(c)
    total += b.length
    if (total > limitBytes) throw new Error('body_too_large')
    chunks.push(b)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const json = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

const normalizeHeaders = (req: IncomingMessage): Record<string, string | undefined> => {
  const out: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase()
    out[key] = Array.isArray(v) ? v.join(',') : v
  }
  return out
}

const isVaultRef = (v: unknown): v is VaultSecretRef =>
  typeof v === 'object' && v !== null && 'kind' in v && (v as { kind?: unknown }).kind === 'vault_ref'

const resolveWebhookSecret = async (
  secret: WebhookSecret | undefined,
  resolveSecret: WebhookSecretResolver | undefined,
): Promise<string | null> => {
  if (!secret) return null
  if (typeof secret === 'string') return secret
  if (isVaultRef(secret)) {
    if (!resolveSecret) return null
    return await resolveSecret(secret)
  }
  return null
}

export const createWebhookServer = (opts: WebhookServerOptions): WebhookServer => {
  const byPath = new Map<string, WebhookTrigger>()
  for (const t of opts.triggers) byPath.set(t.path, t)

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const trigger = byPath.get(url.pathname)
      if (!trigger) return json(res, 404, { error: 'not_found' })

      const method = (req.method ?? 'GET').toUpperCase()
      if (method !== trigger.method) return json(res, 405, { error: 'method_not_allowed' })

      const body = await readBody(req)
      const headers = normalizeHeaders(req)

      const secret = await resolveWebhookSecret(trigger.secret as WebhookSecret | undefined, opts.resolveSecret)

      if (trigger.signing) {
        if (!secret) return json(res, 401, { error: 'missing_secret' })
        const decision = verifyWebhookRequest({ secret, body, headers, config: trigger.signing })
        if (decision.kind === 'deny') return json(res, 401, { error: 'invalid_signature', reason: decision.reason })
      }

      const input = { body, headers, query: Object.fromEntries(url.searchParams.entries()) }
      const result = await opts.runner.runFlow(trigger.flow, { mode: 'real', input })
      return json(res, 200, { status: result.status, runId: result.runId, flowId: result.flowId })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      if (msg === 'body_too_large') return json(res, 413, { error: 'payload_too_large' })
      return json(res, 500, { error: 'internal_error', message: msg })
    }
  })

  return {
    listen: async ({ port = 0, host = '127.0.0.1' } = {}) =>
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
          const addr = server.address()
          if (!addr || typeof addr === 'string') return reject(new Error('unexpected_address'))
          resolve({ port: addr.port, host: addr.address })
        })
      }),
    close: async () =>
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve(undefined)))
      }),
  }
}

/**
 * Convenience helper: signs an outbound webhook request according to the same
 * convention as inbound verification.
 */
export const signOutboundWebhook = ({
  secret,
  body,
  config,
}: {
  secret: string
  body: string
  config?: WebhookTrigger['signing']
}): { timestamp: string; headers: Record<string, string> } => {
  return signWebhookRequest({
    secret,
    body,
    ...(config ? { config } : {}),
  })
}

