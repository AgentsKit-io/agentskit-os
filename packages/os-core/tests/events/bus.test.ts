import { describe, expect, it, vi } from 'vitest'
import type { AnyEvent } from '../../src/events/event.js'
import { InMemoryEventBus } from '../../src/events/bus.js'

const makeEvent = (type: string): AnyEvent =>
  ({
    specversion: '1.0',
    id: '01HXYZTPGGJTZ3WBPJN3XKXQ7N',
    type,
    source: 'agentskitos://test',
    time: '2026-05-01T17:00:00.000Z',
    datacontenttype: 'application/json',
    dataschema: 'agentskitos://schema/test/v1',
    data: { ok: true },
    workspaceId: 'team-a',
    principalId: 'usr_1',
    traceId: 'trace_1',
    spanId: 'span_1',
  }) as AnyEvent

describe('InMemoryEventBus', () => {
  it('delivers to exact-match subscribers', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('agent.task.completed', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not deliver to non-matching subscribers', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('flow.run.started', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('matches wildcard suffix', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('agent.*', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    await bus.publish(makeEvent('agent.task.failed'))
    await bus.publish(makeEvent('flow.run.started'))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('matches global wildcard', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('*', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    await bus.publish(makeEvent('flow.run.started'))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('matches single-segment wildcard mid-pattern', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('agent.*.completed', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    await bus.publish(makeEvent('agent.run.completed'))
    await bus.publish(makeEvent('agent.task.failed'))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe stops delivery', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    const sub = bus.subscribe('agent.*', handler)
    await bus.publish(makeEvent('agent.task.completed'))
    sub.unsubscribe()
    await bus.publish(makeEvent('agent.task.failed'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('isolates handler errors via onHandlerError', async () => {
    const sink = vi.fn()
    const bus = new InMemoryEventBus({ onHandlerError: sink })
    const ok = vi.fn()
    bus.subscribe('agent.*', () => {
      throw new Error('boom')
    })
    bus.subscribe('agent.*', ok)
    await bus.publish(makeEvent('agent.task.completed'))
    expect(sink).toHaveBeenCalledOnce()
    expect(ok).toHaveBeenCalledOnce()
  })

  it('close() prevents publish + subscribe', async () => {
    const bus = new InMemoryEventBus()
    await bus.close()
    await expect(bus.publish(makeEvent('agent.task.completed'))).rejects.toThrow()
    expect(() => bus.subscribe('*', () => undefined)).toThrow()
  })

  it('size reflects subscription count', () => {
    const bus = new InMemoryEventBus()
    bus.subscribe('a.*', () => undefined)
    bus.subscribe('b.*', () => undefined)
    expect(bus.size).toBe(2)
  })

  it('awaits async handlers', async () => {
    const bus = new InMemoryEventBus()
    let done = false
    bus.subscribe('*', async () => {
      await new Promise((r) => setTimeout(r, 5))
      done = true
    })
    await bus.publish(makeEvent('any.thing.happened'))
    expect(done).toBe(true)
  })
})
