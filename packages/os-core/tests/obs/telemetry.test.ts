import { describe, expect, it } from 'vitest'
import {
  bucketDuration,
  decideEmit,
  parseTelemetryConfig,
  parseTelemetryEvent,
} from '../../src/obs/telemetry.js'

describe('decideEmit', () => {
  it('drops when consent is unset', () => {
    expect(decideEmit({ state: 'unset' })).toBe('drop')
  })
  it('drops when consent is disabled', () => {
    expect(decideEmit({ state: 'disabled' })).toBe('drop')
  })
  it('emits when consent is enabled', () => {
    expect(decideEmit({ state: 'enabled' })).toBe('emit')
  })
})

describe('bucketDuration', () => {
  it('rounds to nearest 50ms', () => {
    expect(bucketDuration(0)).toBe(0)
    expect(bucketDuration(24)).toBe(0)
    expect(bucketDuration(25)).toBe(50)
    expect(bucketDuration(99)).toBe(100)
    expect(bucketDuration(123)).toBe(100)
  })
  it('clamps negative to 0', () => {
    expect(bucketDuration(-1)).toBe(0)
  })
})

describe('TelemetryEvent schema', () => {
  const base = {
    kind: 'cli.invoke' as const,
    at: '2026-05-04T12:00:00.000Z',
    installId: '550e8400-e29b-41d4-a716-446655440000',
    cliVersion: '0.0.0',
    osCoreVersion: '0.0.0',
    os: 'darwin' as const,
    nodeVersion: '22.0.0',
    verb: 'init',
  }

  it('parses canonical cli.invoke event', () => {
    const e = parseTelemetryEvent(base)
    expect(e.verb).toBe('init')
  })

  it('rejects events with unknown error code field types', () => {
    expect(() => parseTelemetryEvent({ ...base, errorCode: 123 })).toThrow()
  })

  it('rejects messages or stack traces (no such fields exist)', () => {
    const evil = { ...base, message: 'oops', stack: 'at foo' }
    const e = parseTelemetryEvent(evil)
    expect((e as unknown as { message?: string }).message).toBeUndefined()
    expect((e as unknown as { stack?: string }).stack).toBeUndefined()
  })
})

describe('TelemetryConfig defaults', () => {
  it('defaults consent to unset and sink.file to true', () => {
    const cfg = parseTelemetryConfig({})
    expect(cfg.consent.state).toBe('unset')
    expect(cfg.sink.file).toBe(true)
  })
})
