import { describe, expect, it } from 'vitest'
import {
  INTEGRATION_TRIGGER_CONTRACTS,
  createTriggerRegistry,
  parseTriggerConfig,
  registerIntegrationTriggerContracts,
} from '../../src/index.js'

const event = (id: string) => ({
  triggerId: id,
  receivedAt: 1_700_000_000_000,
  payload: { source: 'test' },
})

describe('integration trigger contracts (#159-#164)', () => {
  it('registers every integration kind exactly once', () => {
    const r = registerIntegrationTriggerContracts(createTriggerRegistry())
    const kinds = r.list().map((c) => c.kind).sort()
    expect(kinds).toEqual(['discord', 'pagerduty', 's3', 'sentry', 'stripe', 'twilio'])
  })

  it('parses and dispatches a stripe trigger', async () => {
    const r = registerIntegrationTriggerContracts(createTriggerRegistry())
    const cfg = parseTriggerConfig({
      kind: 'stripe',
      id: 'st',
      name: 'invoice.paid',
      enabled: true,
      flow: 'finance',
      account: 'acct_123',
      event: 'invoice.paid',
    })
    const out = await r.dispatch(cfg, event('st'))
    expect(out.kind).toBe('dispatched')
  })

  it('rejects an s3 trigger with no events', async () => {
    const sample = INTEGRATION_TRIGGER_CONTRACTS.find((c) => c.kind === 's3')!
    expect(
      sample.validate({
        kind: 's3',
        id: 's',
        name: 's',
        enabled: true,
        flow: 'f',
        bucket: 'my-bucket',
        events: [],
        tags: [],
      } as never),
    ).toContain('s3 trigger needs at least one event')
  })

  it('parses every new trigger schema (smoke)', () => {
    expect(() => parseTriggerConfig({
      kind: 'discord', id: 'd', name: 'd', enabled: true, flow: 'f', channelId: 'C123',
    })).not.toThrow()
    expect(() => parseTriggerConfig({
      kind: 'twilio', id: 't', name: 't', enabled: true, flow: 'f', toNumber: '+15555550100',
    })).not.toThrow()
    expect(() => parseTriggerConfig({
      kind: 'sentry', id: 's', name: 's', enabled: true, flow: 'f', project: 'proj',
    })).not.toThrow()
    expect(() => parseTriggerConfig({
      kind: 'pagerduty', id: 'p', name: 'p', enabled: true, flow: 'f', service: 'svc-1',
    })).not.toThrow()
  })
})
