import { describe, expect, it } from 'vitest'
import {
  createInMemoryHitlInbox,
  parseHitlInboxSnapshot,
  restoreHitlInbox,
  snapshotHitlInbox,
} from '../../src/index.js'

const seed = () => {
  const inbox = createInMemoryHitlInbox()
  inbox.enqueue({
    schemaVersion: 1,
    id: 't1',
    createdAt: '2026-05-06T12:00:00Z',
    prompt: 'Approve release?',
    approvers: ['lead'],
    quorum: 1,
    tags: [],
  })
  inbox.enqueue({
    schemaVersion: 1,
    id: 't2',
    createdAt: '2026-05-06T12:05:00Z',
    prompt: 'Approve config change?',
    approvers: [],
    quorum: 1,
    tags: ['config'],
  })
  inbox.decide({ id: 't2', by: 'lead', decision: 'approved', at: '2026-05-06T12:06:00Z' })
  return inbox
}

describe('HITL persistence (#62)', () => {
  it('snapshot captures every task with capturedAt timestamp', () => {
    const inbox = seed()
    const snap = snapshotHitlInbox(inbox, { clock: () => '2026-05-06T12:10:00Z' })
    expect(snap.tasks).toHaveLength(2)
    expect(snap.capturedAt).toBe('2026-05-06T12:10:00Z')
    expect(snap.tasks.find((t) => t.id === 't2')?.status).toBe('approved')
  })

  it('restoreHitlInbox produces an inbox that round-trips the snapshot', () => {
    const original = seed()
    const snap = snapshotHitlInbox(original)
    const restored = restoreHitlInbox(snap)
    expect(restored.list()).toEqual(original.list())
    expect(restored.get('t2')?.decision).toBe('approved')
  })

  it('parseHitlInboxSnapshot rejects unknown shapes', () => {
    expect(() => parseHitlInboxSnapshot({ schemaVersion: 99, tasks: [] })).toThrow()
  })
})
