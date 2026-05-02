import type { AnyEvent } from '@agentskit/os-core'
import type { Signer } from '../src/emitter.js'

let idCounter = 0
const ULID_BASE = '01HXYZTPGGJTZ3WBPJN3XKXQ'

export const nextUlid = (): string => {
  idCounter = (idCounter + 1) % 36 ** 2
  return `${ULID_BASE}${idCounter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}

export const fakeEvent = (overrides: Partial<AnyEvent> = {}): AnyEvent =>
  ({
    specversion: '1.0',
    id: nextUlid(),
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

export const fakeSigner = (): Signer => ({
  sign: async () => ({
    algorithm: 'ed25519',
    publicKey: 'A'.repeat(64),
    signature: 'B'.repeat(64),
  }),
})

let batchIdCounter = 0
const BATCH_BASE = '01HBATCHTPGGJTZ3WBPJN3XQ'
export const nextBatchId = (): string => {
  batchIdCounter = (batchIdCounter + 1) % 36 ** 2
  return `${BATCH_BASE}${batchIdCounter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}
