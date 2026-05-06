import { describe, expect, it } from 'vitest'
import {
  createTriggerRegistry,
  parseTriggerConfig,
  type TriggerContract,
  type TriggerEvent,
} from '../../src/index.js'

const cronContract: TriggerContract = {
  kind: 'cron',
  displayName: 'Cron',
  validate: () => [],
  dispatch: async (_cfg, ev) => ({
    kind: 'dispatched',
    runId: `run-${ev.triggerId}-${ev.receivedAt}`,
    flow: 'orchestrator-entry',
  }),
}

const cronCfg = parseTriggerConfig({
  kind: 'cron',
  id: 'every-5m',
  name: 'Every 5m',
  enabled: true,
  flow: 'orchestrator-entry',
  cron: '*/5 * * * *',
})

const event: TriggerEvent = {
  triggerId: 'every-5m',
  receivedAt: 1_700_000_000_000,
  payload: { tickedAt: 'now' },
}

describe('createTriggerRegistry (#80)', () => {
  it('registers a contract and dispatches an event through it', async () => {
    const r = createTriggerRegistry()
    expect(r.register(cronContract)).toEqual({ kind: 'registered', triggerKind: 'cron' })
    const out = await r.dispatch(cronCfg, event)
    expect(out.kind).toBe('dispatched')
  })

  it('reports conflict when the same kind is registered twice', () => {
    const r = createTriggerRegistry()
    r.register(cronContract)
    const second = r.register({ ...cronContract, displayName: 'Other Cron' })
    expect(second.kind).toBe('conflict')
  })

  it('returns failed when dispatching a kind without a contract', async () => {
    const r = createTriggerRegistry()
    const out = await r.dispatch(cronCfg, event)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') {
      expect(out.error.code).toBe('trigger.kind_not_registered')
    }
  })

  it('returns failed when contract validate() reports issues', async () => {
    const r = createTriggerRegistry()
    r.register({
      ...cronContract,
      validate: () => ['bad expression'],
    })
    const out = await r.dispatch(cronCfg, event)
    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') {
      expect(out.error.code).toBe('trigger.config_invalid')
      expect(out.error.message).toContain('bad expression')
    }
  })

  it('list returns every registered contract', () => {
    const r = createTriggerRegistry()
    r.register(cronContract)
    expect(r.list().map((c) => c.kind)).toEqual(['cron'])
    expect(r.unregister('cron')).toBe(true)
    expect(r.list()).toHaveLength(0)
  })
})
