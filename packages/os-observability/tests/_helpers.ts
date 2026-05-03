import type { AnyEvent } from '@agentskit/os-core'

let counter = 0
const ULID_BASE = '01HXYZTPGGJTZ3WBPJN3XKXQ'

export const nextId = (): string => {
  counter = (counter + 1) % 36 ** 2
  return `${ULID_BASE}${counter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}

export const fakeEvent = (overrides: Partial<AnyEvent> = {}): AnyEvent =>
  ({
    specversion: '1.0',
    id: nextId(),
    type: 'agent.task.completed',
    source: 'agentskitos://test',
    time: '2026-05-02T17:00:00.000Z',
    datacontenttype: 'application/json',
    dataschema: 'agentskitos://schema/test/v1',
    data: { ok: true },
    workspaceId: 'team-a',
    principalId: 'usr_1',
    traceId: 'trace_1',
    spanId: 'span_1',
    ...overrides,
  }) as AnyEvent
