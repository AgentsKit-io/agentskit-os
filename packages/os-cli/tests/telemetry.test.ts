import { describe, expect, it } from 'vitest'
import { telemetry } from '../src/commands/telemetry.js'
import { fakeIo } from './_fake-io.js'

const ROOT = '.agentskitos'

describe('telemetry command', () => {
  it('shows usage for missing subcommand', async () => {
    const r = await telemetry.run([], fakeIo())
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toMatch(/usage|help|status|enable|disable|export|telemetry/i)
  })

  it('status reports unset when no consent saved', async () => {
    const r = await telemetry.run(['status'], fakeIo())
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('state: unset')
    expect(r.stdout).toContain('installId: (none)')
  })

  it('enable persists consent + generates installId', async () => {
    const io = fakeIo()
    const r = await telemetry.run(['enable'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('telemetry enabled')
    const status = await telemetry.run(['status'], io)
    expect(status.stdout).toContain('state: enabled')
    expect(status.stdout).not.toContain('installId: (none)')
  })

  it('disable preserves installId', async () => {
    const io = fakeIo()
    const enable = await telemetry.run(['enable'], io)
    const idMatch = /installId=([a-f0-9-]+)/.exec(enable.stdout)
    expect(idMatch).toBeTruthy()
    const disable = await telemetry.run(['disable'], io)
    expect(disable.stdout).toContain(`installId=${idMatch![1]}`)
  })

  it('export emits json by default', async () => {
    const io = fakeIo({
      [`${ROOT}/telemetry/events.jsonl`]:
        `{"kind":"cli.invoke","at":"2026-05-04T12:00:00.000Z","installId":"550e8400-e29b-41d4-a716-446655440000","cliVersion":"0.0.0","osCoreVersion":"0.0.0","os":"darwin","nodeVersion":"22.0.0","verb":"init"}\n`,
    })
    const r = await telemetry.run(['export'], io)
    expect(r.code).toBe(0)
    const events = JSON.parse(r.stdout)
    expect(events).toHaveLength(1)
    expect(events[0].verb).toBe('init')
  })

  it('export --csv emits csv with header', async () => {
    const io = fakeIo({
      [`${ROOT}/telemetry/events.jsonl`]:
        `{"kind":"cli.invoke","at":"2026-05-04T12:00:00.000Z","installId":"i","cliVersion":"0","osCoreVersion":"0","os":"darwin","nodeVersion":"22","verb":"init"}\n`,
    })
    const r = await telemetry.run(['export', '--csv'], io)
    expect(r.code).toBe(0)
    expect(r.stdout.split('\n')[0]).toBe('at,kind,verb,runMode,nodeKind,errorCode,durationMs,exitCode,cliVersion,os,nodeVersion,installId')
  })

  it('export --since filters events by date', async () => {
    const io = fakeIo({
      [`${ROOT}/telemetry/events.jsonl`]:
        `{"kind":"cli.invoke","at":"2025-01-01T00:00:00.000Z","installId":"i","cliVersion":"0","osCoreVersion":"0","os":"darwin","nodeVersion":"22","verb":"old"}\n` +
        `{"kind":"cli.invoke","at":"2026-05-04T12:00:00.000Z","installId":"i","cliVersion":"0","osCoreVersion":"0","os":"darwin","nodeVersion":"22","verb":"new"}\n`,
    })
    const r = await telemetry.run(['export', '--since', '2026-01-01T00:00:00.000Z'], io)
    const events = JSON.parse(r.stdout)
    expect(events).toHaveLength(1)
    expect(events[0].verb).toBe('new')
  })

  it('export --dry-run summarizes without printing values', async () => {
    const io = fakeIo({
      [`${ROOT}/telemetry/events.jsonl`]:
        `{"kind":"cli.invoke","at":"2026-05-04T12:00:00.000Z","installId":"i","cliVersion":"0","osCoreVersion":"0","os":"darwin","nodeVersion":"22","verb":"secret-name"}\n`,
    })
    const r = await telemetry.run(['export', '--dry-run'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('would export 1')
    expect(r.stdout).toContain('cli.invoke: 1')
    expect(r.stdout).not.toContain('secret-name')
  })
})
