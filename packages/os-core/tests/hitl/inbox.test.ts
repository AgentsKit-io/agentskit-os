import { describe, expect, it } from 'vitest'
import { createInMemoryHitlInbox } from '../../src/hitl/inbox.js'

describe('createInMemoryHitlInbox (#337)', () => {
  it('enqueues and resolves a task', () => {
    const inbox = createInMemoryHitlInbox()
    const t = inbox.enqueue({
      schemaVersion: 1,
      id: 't1',
      createdAt: '2026-05-06T00:00:00.000Z',
      prompt: 'Approve deploy?',
      approvers: ['maintainer'],
      quorum: 1,
      tags: ['deploy'],
    })
    expect(t.status).toBe('open')
    expect(inbox.list('open')).toHaveLength(1)

    const r = inbox.decide({ id: 't1', by: 'maintainer', decision: 'approved', note: 'ok', at: '2026-05-06T00:01:00.000Z' })
    expect(r.status).toBe('approved')
    expect(r.resolvedBy).toBe('maintainer')
    expect(inbox.list('open')).toHaveLength(0)
    expect(inbox.list('approved')).toHaveLength(1)
  })
})

