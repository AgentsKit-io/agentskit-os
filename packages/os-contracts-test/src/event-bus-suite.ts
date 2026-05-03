// Golden contract suite for EventBus impls. Covers wildcard match,
// hierarchical patterns, error isolation, close semantics.

import type { AnyEvent, EventBus } from '@agentskit/os-core'
import type { SuiteHooks } from './checkpoint-store-suite.js'

export type EventBusFactory = () => Promise<EventBus> | EventBus

const fakeEvent = (type: string, overrides: Partial<AnyEvent> = {}): AnyEvent =>
  ({
    specversion: '1.0',
    id: '01HBUSEVENTID',
    type,
    source: 'agentskitos://contract-test',
    time: '2026-05-02T17:00:00.000Z',
    datacontenttype: 'application/json',
    dataschema: 'agentskitos://schema/test/v1',
    data: {},
    workspaceId: 'team-a',
    principalId: 'usr_1',
    traceId: 'trace_1',
    spanId: 'span_1',
    ...overrides,
  }) as AnyEvent

export const runEventBusSuite = (
  hooks: SuiteHooks,
  label: string,
  factory: EventBusFactory,
): void => {
  const { describe, it, beforeEach, expect } = hooks

  describe(`EventBus contract: ${label}`, () => {
    let bus: EventBus
    beforeEach(async () => { bus = await factory() })

    it('subscriber receives matching event', async () => {
      const seen: string[] = []
      bus.subscribe('agent.task.completed', (e) => { seen.push(e.type) })
      await bus.publish(fakeEvent('agent.task.completed'))
      expect(seen).toEqual(['agent.task.completed'])
    })

    it('exact type mismatch is filtered', async () => {
      const seen: string[] = []
      bus.subscribe('flow.node.completed', (e) => { seen.push(e.type) })
      await bus.publish(fakeEvent('agent.task.completed'))
      expect(seen).toEqual([])
    })

    it('wildcard "*" matches every type', async () => {
      const seen: string[] = []
      bus.subscribe('*', (e) => { seen.push(e.type) })
      await bus.publish(fakeEvent('agent.task.completed'))
      await bus.publish(fakeEvent('flow.node.failed'))
      expect(seen).toEqual(['agent.task.completed', 'flow.node.failed'])
    })

    it('hierarchical wildcard matches its segment scope', async () => {
      const seen: string[] = []
      bus.subscribe('flow.*', (e) => { seen.push(e.type) })
      await bus.publish(fakeEvent('flow.node.failed'))
      await bus.publish(fakeEvent('agent.task.completed'))
      expect(seen.length).toBe(1)
    })

    it('unsubscribe detaches handler', async () => {
      const seen: string[] = []
      const sub = bus.subscribe('*', (e) => { seen.push(e.type) })
      sub.unsubscribe()
      await bus.publish(fakeEvent('agent.task.completed'))
      expect(seen).toEqual([])
    })

    it('handler throw does not bubble to publish caller', async () => {
      bus.subscribe('*', () => { throw new Error('boom') })
      await expect(
        Promise.resolve(bus.publish(fakeEvent('agent.task.completed'))),
      ).resolves.toBeUndefined()
    })

    it('close() prevents further publish/subscribe', async () => {
      await bus.close()
      await expect(bus.publish(fakeEvent('x'))).rejects.toThrow(/closed/)
    })
  })
}
