import { describe, expect, it, vi } from 'vitest'
import type { LogLine } from '@agentskit/os-observability'
import {
  createOtelLogWriter,
  toOtelLogRecord,
  OTEL_SEVERITY,
  type OtelLogRecord,
  type OtelLoggerShape,
} from '../src/index.js'

const line = (overrides: Partial<LogLine> = {}): LogLine => ({
  level: 'info',
  time: '2026-05-02T17:00:00.000Z',
  type: 'agent.task.completed',
  message: 'hello',
  workspaceId: 'team-a',
  traceId: 't',
  spanId: 's',
  eventId: 'e',
  fields: { extra: 1 },
  ...overrides,
})

describe('toOtelLogRecord', () => {
  it.each(['debug', 'info', 'warn', 'error'] as const)('maps level %s', (lv) => {
    const r = toOtelLogRecord(line({ level: lv }))
    expect(r.severityNumber).toBe(OTEL_SEVERITY[lv].number)
    expect(r.severityText).toBe(OTEL_SEVERITY[lv].text)
  })

  it('uses message as body', () => {
    expect(toOtelLogRecord(line({ message: 'hi' })).body).toBe('hi')
  })

  it('forwards trace + span + workspace + event attrs', () => {
    const r = toOtelLogRecord(line({ traceId: 'X', spanId: 'Y', eventId: 'Z' }))
    expect(r.attributes['trace.id']).toBe('X')
    expect(r.attributes['span.id']).toBe('Y')
    expect(r.attributes['agentskitos.event.id']).toBe('Z')
    expect(r.attributes['agentskitos.event.type']).toBe('agent.task.completed')
  })

  it('merges event fields under attributes', () => {
    const r = toOtelLogRecord(line({ fields: { tool: 'echo' } }))
    expect(r.attributes['tool']).toBe('echo')
  })

  it('timestamp is parsed time × 1e6 (nanos)', () => {
    const r = toOtelLogRecord(line({ time: '2026-01-01T00:00:00.000Z' }))
    expect(r.timestamp).toBe(Date.parse('2026-01-01T00:00:00.000Z') * 1_000_000)
  })

  it('timestamp = 0 for invalid time', () => {
    const r = toOtelLogRecord(line({ time: 'nope' as never }))
    expect(r.timestamp).toBe(0)
  })
})

describe('createOtelLogWriter', () => {
  it('emits to logger.emit', () => {
    const records: OtelLogRecord[] = []
    const logger: OtelLoggerShape = { emit: (r) => { records.push(r) } }
    const w = createOtelLogWriter({ logger })
    w.write(line())
    expect(records.length).toBe(1)
    expect(records[0]!.body).toBe('hello')
  })

  it('forwards logger throws to onError', () => {
    const onError = vi.fn()
    const logger: OtelLoggerShape = { emit: () => { throw new Error('boom') } }
    const w = createOtelLogWriter({ logger, onError })
    w.write(line())
    expect(onError).toHaveBeenCalledOnce()
  })
})
