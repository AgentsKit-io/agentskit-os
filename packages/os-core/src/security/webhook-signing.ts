import { createHmac, timingSafeEqual } from 'node:crypto'

export type WebhookHmacAlgorithm = 'hmac-sha256'

export type WebhookSigningConfig = {
  algorithm?: WebhookHmacAlgorithm
  signatureHeader?: string
  timestampHeader?: string
  toleranceSeconds?: number
}

export type WebhookSignature = {
  version: 'v1'
  digestHex: string
}

const DEFAULT_SIGNATURE_HEADER = 'x-agentskit-signature'
const DEFAULT_TIMESTAMP_HEADER = 'x-agentskit-timestamp'
const DEFAULT_TOLERANCE_SECONDS = 300

export const computeWebhookSignature = ({
  secret,
  body,
  timestamp,
  algorithm = 'hmac-sha256',
}: {
  secret: string
  body: string
  timestamp: string
  algorithm?: WebhookHmacAlgorithm
}): WebhookSignature => {
  if (algorithm !== 'hmac-sha256') throw new Error(`unsupported algorithm: ${algorithm}`)
  const digestHex = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
  return { version: 'v1', digestHex }
}

export const formatWebhookSignatureHeader = (sig: WebhookSignature): string => `${sig.version}=${sig.digestHex}`

export const parseWebhookSignatureHeader = (value: string | undefined | null): WebhookSignature | null => {
  if (!value) return null
  const m = value.match(/^\s*(v1)=([0-9a-f]{64})\s*$/i)
  if (!m) return null
  return { version: 'v1', digestHex: m[2]!.toLowerCase() }
}

const safeEqHex = (aHex: string, bHex: string): boolean => {
  if (aHex.length !== bHex.length) return false
  const a = Buffer.from(aHex, 'hex')
  const b = Buffer.from(bHex, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type WebhookVerifyDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: 'missing_signature' | 'malformed_signature' | 'missing_timestamp' | 'stale' | 'bad_signature' }

export const verifyWebhookRequest = ({
  secret,
  body,
  headers,
  nowMs = Date.now(),
  config,
}: {
  secret: string
  body: string
  headers: Record<string, string | undefined>
  nowMs?: number
  config?: WebhookSigningConfig
}): WebhookVerifyDecision => {
  const signatureHeader = (config?.signatureHeader ?? DEFAULT_SIGNATURE_HEADER).toLowerCase()
  const timestampHeader = (config?.timestampHeader ?? DEFAULT_TIMESTAMP_HEADER).toLowerCase()
  const toleranceSeconds = config?.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS

  const rawSig = headers[signatureHeader]
  const parsed = parseWebhookSignatureHeader(rawSig)
  if (!rawSig) return { kind: 'deny', reason: 'missing_signature' }
  if (!parsed) return { kind: 'deny', reason: 'malformed_signature' }

  const timestamp = headers[timestampHeader]
  if (!timestamp) return { kind: 'deny', reason: 'missing_timestamp' }

  if (toleranceSeconds > 0) {
    const tsMs = Number(timestamp) * 1000
    if (!Number.isFinite(tsMs)) return { kind: 'deny', reason: 'missing_timestamp' }
    const ageMs = Math.abs(nowMs - tsMs)
    if (ageMs > toleranceSeconds * 1000) return { kind: 'deny', reason: 'stale' }
  }

  const expected = computeWebhookSignature({ secret, body, timestamp, algorithm: config?.algorithm ?? 'hmac-sha256' })
  if (!safeEqHex(expected.digestHex, parsed.digestHex)) return { kind: 'deny', reason: 'bad_signature' }

  return { kind: 'allow' }
}

export const signWebhookRequest = ({
  secret,
  body,
  timestamp = Math.floor(Date.now() / 1000).toString(),
  config,
}: {
  secret: string
  body: string
  timestamp?: string
  config?: WebhookSigningConfig
}): { timestamp: string; headers: Record<string, string> } => {
  const signatureHeader = (config?.signatureHeader ?? DEFAULT_SIGNATURE_HEADER).toLowerCase()
  const timestampHeader = (config?.timestampHeader ?? DEFAULT_TIMESTAMP_HEADER).toLowerCase()
  const sig = computeWebhookSignature({ secret, body, timestamp, algorithm: config?.algorithm ?? 'hmac-sha256' })
  return {
    timestamp,
    headers: {
      [timestampHeader]: timestamp,
      [signatureHeader]: formatWebhookSignatureHeader(sig),
    },
  }
}

