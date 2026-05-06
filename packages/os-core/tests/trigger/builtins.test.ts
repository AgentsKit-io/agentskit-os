import { describe, expect, it } from 'vitest'
import {
  BUILTIN_TRIGGER_CONTRACTS,
  createTriggerRegistry,
  parseTriggerConfig,
  registerBuiltinTriggerContracts,
} from '../../src/index.js'

const baseEvent = (id: string) => ({
  triggerId: id,
  receivedAt: 1_700_000_000_000,
  payload: { from: 'test' },
})

describe('built-in trigger contracts (#71-#78)', () => {
  it('registers every built-in kind exactly once', () => {
    const r = registerBuiltinTriggerContracts(createTriggerRegistry())
    const kinds = r.list().map((c) => c.kind).sort()
    expect(kinds).toEqual(['cron', 'file', 'github', 'linear', 'slack', 'webhook'])
  })

  it('cron contract validates expression length', () => {
    const cron = BUILTIN_TRIGGER_CONTRACTS.find((c) => c.kind === 'cron')!
    const valid = parseTriggerConfig({
      kind: 'cron',
      id: 't',
      name: 'every 5m',
      enabled: true,
      flow: 'f',
      cron: '*/5 * * * *',
    })
    expect(cron.validate(valid as never)).toEqual([])
  })

  it('webhook contract rejects malformed paths', () => {
    const webhook = BUILTIN_TRIGGER_CONTRACTS.find((c) => c.kind === 'webhook')!
    expect(
      webhook.validate({
        kind: 'webhook',
        id: 'wh',
        name: 'wh',
        enabled: true,
        flow: 'f',
        path: 'no-slash',
        method: 'POST',
        tags: [],
      } as never),
    ).toContain('webhook path "no-slash" must start with "/" and use safe chars')
  })

  it('dispatch routes through the registry to the matching contract', async () => {
    const r = registerBuiltinTriggerContracts(createTriggerRegistry())
    const cfg = parseTriggerConfig({
      kind: 'github',
      id: 'gh',
      name: 'PRs on agentskit',
      enabled: true,
      flow: 'reviewer',
      repo: 'agentskit/os',
      event: 'pull_request',
    })
    const out = await r.dispatch(cfg, baseEvent('gh'))
    expect(out.kind).toBe('dispatched')
    if (out.kind === 'dispatched') {
      expect(out.flow).toBe('reviewer')
    }
  })
})
