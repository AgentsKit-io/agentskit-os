import { describe, expect, it } from 'vitest'
import { InMemoryEventBus } from '@agentskit/os-core'
import {
  createLogSink,
  defaultClassify,
  type LogLine,
  type LogWriter,
} from '../src/index.js'
import { fakeEvent } from './_helpers.js'

const collector = (): LogWriter & { lines: LogLine[] } => {
  const lines: LogLine[] = []
  return { lines, write: (l) => { lines.push(l) } }
}

describe('defaultClassify', () => {
  it('returns "error" for *.failed / *.error / *.rejected', () => {
    expect(defaultClassify(fakeEvent({ type: 'flow.node.failed' }))).toBe('error')
    expect(defaultClassify(fakeEvent({ type: 'tool.error' }))).toBe('error')
    expect(defaultClassify(fakeEvent({ type: 'human.rejected' }))).toBe('error')
  })

  it('returns "warn" for *.paused / *.skipped / *.degraded', () => {
    expect(defaultClassify(fakeEvent({ type: 'flow.node.paused' }))).toBe('warn')
    expect(defaultClassify(fakeEvent({ type: 'flow.node.skipped' }))).toBe('warn')
    expect(defaultClassify(fakeEvent({ type: 'sandbox.degraded' }))).toBe('warn')
  })

  it('returns "debug" for *.started / *.created', () => {
    expect(defaultClassify(fakeEvent({ type: 'flow.node.started' }))).toBe('debug')
    expect(defaultClassify(fakeEvent({ type: 'run.created' }))).toBe('debug')
  })

  it('returns "info" otherwise', () => {
    expect(defaultClassify(fakeEvent({ type: 'agent.task.completed' }))).toBe('info')
  })
})

describe('createLogSink', () => {
  it('emits a LogLine per event', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w })
    await sink(fakeEvent({ type: 'agent.task.completed' }))
    expect(w.lines.length).toBe(1)
    expect(w.lines[0]!.level).toBe('info')
  })

  it('respects minLevel filter', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w, minLevel: 'warn' })
    await sink(fakeEvent({ type: 'flow.node.started' })) // debug
    await sink(fakeEvent({ type: 'agent.task.completed' })) // info
    await sink(fakeEvent({ type: 'flow.node.paused' })) // warn
    await sink(fakeEvent({ type: 'flow.node.failed' })) // error
    expect(w.lines.length).toBe(2)
    expect(w.lines.map((l) => l.level)).toEqual(['warn', 'error'])
  })

  it('forwards traceId / spanId / workspaceId from envelope', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w })
    await sink(fakeEvent({ traceId: 't9', spanId: 's9', workspaceId: 'team-z' }))
    const line = w.lines[0]!
    expect(line.traceId).toBe('t9')
    expect(line.spanId).toBe('s9')
    expect(line.workspaceId).toBe('team-z')
  })

  it('uses event.data.message as the log message when present', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w })
    await sink(fakeEvent({ type: 'agent.task.completed', data: { message: 'all good' } }))
    expect(w.lines[0]!.message).toBe('all good')
  })

  it('falls back to event.type when no data.message', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w })
    await sink(fakeEvent({ type: 'agent.task.completed', data: { ok: true } }))
    expect(w.lines[0]!.message).toBe('agent.task.completed')
  })

  it('honors classify override', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w, classify: () => 'error' })
    await sink(fakeEvent())
    expect(w.lines[0]!.level).toBe('error')
  })

  it('honors format override', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w, format: () => 'forced' })
    await sink(fakeEvent())
    expect(w.lines[0]!.message).toBe('forced')
  })

  it('honors extract override for fields', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w, extract: () => ({ x: 1 }) })
    await sink(fakeEvent())
    expect(w.lines[0]!.fields).toEqual({ x: 1 })
  })

  it('integrates with InMemoryEventBus.subscribe', async () => {
    const bus = new InMemoryEventBus()
    const w = collector()
    bus.subscribe('*', createLogSink({ writer: w }))
    await bus.publish(fakeEvent({ type: 'agent.task.completed' }))
    await bus.publish(fakeEvent({ type: 'flow.node.failed' }))
    expect(w.lines.length).toBe(2)
  })

  it('defaults missing trace/span to empty string', async () => {
    const w = collector()
    const sink = createLogSink({ writer: w })
    await sink(fakeEvent({ traceId: undefined, spanId: undefined }) as never)
    expect(w.lines[0]!.traceId).toBe('')
    expect(w.lines[0]!.spanId).toBe('')
  })
})
