import { describe, expect, it } from 'vitest'

import { signWebhookRequest, verifyWebhookRequest } from '../../src/security/webhook-signing.js'

describe('webhook signing', () => {
  it('signs then verifies', () => {
    const body = JSON.stringify({ hello: 'world' })
    const secret = 'super-secret'

    const signed = signWebhookRequest({ secret, body, timestamp: '1714860000' })

    const decision = verifyWebhookRequest({
      secret,
      body,
      headers: signed.headers,
      nowMs: 1714860000 * 1000,
    })

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('rejects missing signature', () => {
    const decision = verifyWebhookRequest({
      secret: 's',
      body: 'x',
      headers: { 'x-agentskit-timestamp': '1' },
      nowMs: 1000,
    })
    expect(decision).toEqual({ kind: 'deny', reason: 'missing_signature' })
  })

  it('rejects stale signatures by default', () => {
    const body = 'x'
    const secret = 's'
    const signed = signWebhookRequest({ secret, body, timestamp: '10' })
    const decision = verifyWebhookRequest({
      secret,
      body,
      headers: signed.headers,
      nowMs: 1000 * 1000,
    })
    expect(decision).toEqual({ kind: 'deny', reason: 'stale' })
  })

  it('can disable freshness check with toleranceSeconds=0', () => {
    const body = 'x'
    const secret = 's'
    const signed = signWebhookRequest({ secret, body, timestamp: '10' })
    const decision = verifyWebhookRequest({
      secret,
      body,
      headers: signed.headers,
      nowMs: 1000 * 1000,
      config: { toleranceSeconds: 0 },
    })
    expect(decision).toEqual({ kind: 'allow' })
  })
})

