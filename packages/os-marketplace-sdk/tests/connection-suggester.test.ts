import { describe, expect, it } from 'vitest'
import { suggestConnections } from '../src/connection-suggester.js'

describe('suggestConnections (#88)', () => {
  it('detects Slack + GitHub from a multi-clause brief', () => {
    const out = suggestConnections('On every GitHub PR merge, post a summary in Slack #releases.')
    const ids = out.map((s) => s.integration)
    expect(ids).toContain('github')
    expect(ids).toContain('slack')
  })

  it('returns higher score when more keywords hit', () => {
    const a = suggestConnections('Slack')
    const b = suggestConnections('Slack channel mention DM')
    expect(b[0]!.score).toBeGreaterThanOrEqual(a[0]!.score)
  })

  it('emits suggestedPermissions per integration', () => {
    const out = suggestConnections('Charge customer via Stripe and email a receipt.')
    const stripe = out.find((s) => s.integration === 'stripe')
    expect(stripe?.suggestedPermissions).toContain('net:fetch:api.stripe.com')
  })

  it('returns empty when no keywords match', () => {
    expect(suggestConnections('plain unrelated text')).toEqual([])
  })
})
