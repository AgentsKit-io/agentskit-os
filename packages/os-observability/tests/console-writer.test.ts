import { describe, expect, it, vi } from 'vitest'
import { consoleLogWriter, type LogLine } from '../src/index.js'

const line = (level: LogLine['level']): LogLine => ({
  level,
  time: '2026-05-02T17:00:00.000Z',
  type: 'agent.task.completed',
  message: 'm',
  workspaceId: 'team-a',
  traceId: 't',
  spanId: 's',
  eventId: 'e',
  fields: {},
})

describe('consoleLogWriter', () => {
  it('routes each level to the matching console method', () => {
    const c = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const w = consoleLogWriter({ console: c })
    w.write(line('debug'))
    w.write(line('info'))
    w.write(line('warn'))
    w.write(line('error'))
    expect(c.debug).toHaveBeenCalledOnce()
    expect(c.info).toHaveBeenCalledOnce()
    expect(c.warn).toHaveBeenCalledOnce()
    expect(c.error).toHaveBeenCalledOnce()
  })

  it('emits valid JSON by default', () => {
    let captured = ''
    const c = { debug: vi.fn(), info: (x: string) => { captured = x }, warn: vi.fn(), error: vi.fn() }
    const w = consoleLogWriter({ console: c })
    w.write(line('info'))
    const parsed = JSON.parse(captured) as LogLine
    expect(parsed.level).toBe('info')
    expect(parsed.type).toBe('agent.task.completed')
  })

  it('honors stringify override', () => {
    let captured = ''
    const c = { debug: vi.fn(), info: (x: string) => { captured = x }, warn: vi.fn(), error: vi.fn() }
    const w = consoleLogWriter({ console: c, stringify: (l) => `${l.level}:${l.message}` })
    w.write(line('info'))
    expect(captured).toBe('info:m')
  })
})
