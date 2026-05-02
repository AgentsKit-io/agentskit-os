import { describe, expect, it } from 'vitest'
import {
  EVENT_SPEC_VERSION,
  EventType,
  Ulid,
  EventSource,
  DataSchemaUri,
  parseEvent,
  safeParseEvent,
  RESERVED_TOPIC_ROOTS,
} from '../../src/events/event.js'

const valid = {
  specversion: '1.0' as const,
  id: '01HXYZTPGGJTZ3WBPJN3XKXQ7N',
  type: 'agent.task.completed',
  source: 'agentskitos://workspace/team-a/agent/researcher',
  time: '2026-05-01T17:00:00.000Z',
  datacontenttype: 'application/json' as const,
  dataschema: 'agentskitos://schema/agent_task/v1',
  data: { ok: true },
  workspaceId: 'team-a',
  principalId: 'agent_researcher',
  traceId: 'trace_abc',
  spanId: 'span_xyz',
}

describe('EventEnvelope', () => {
  it('exports stable spec version', () => {
    expect(EVENT_SPEC_VERSION).toBe('1.0')
  })

  it('exposes reserved topic roots', () => {
    expect(RESERVED_TOPIC_ROOTS).toContain('agent')
    expect(RESERVED_TOPIC_ROOTS.length).toBeGreaterThanOrEqual(10)
  })

  it('parses a valid envelope', () => {
    const e = parseEvent(valid)
    expect(e.type).toBe('agent.task.completed')
  })

  describe('EventType', () => {
    it.each([['agent.task.completed'], ['flow.run.started'], ['cost.budget.exceeded']])(
      'accepts %s',
      (v) => {
        expect(EventType.safeParse(v).success).toBe(true)
      },
    )

    it.each([['Agent.Task'], ['agent'], ['agent.'], ['.flow'], ['agent..task']])(
      'rejects %s',
      (v) => {
        expect(EventType.safeParse(v).success).toBe(false)
      },
    )
  })

  describe('Ulid', () => {
    it('accepts proper ULID', () => {
      expect(Ulid.safeParse('01HXYZTPGGJTZ3WBPJN3XKXQ7N').success).toBe(true)
    })
    it('rejects lowercase', () => {
      expect(Ulid.safeParse('01hxyztpggjtz3wbpjn3xkxq7n').success).toBe(false)
    })
    it('rejects wrong length', () => {
      expect(Ulid.safeParse('01HXYZ').success).toBe(false)
    })
  })

  describe('EventSource', () => {
    it('accepts agentskitos URI', () => {
      expect(EventSource.safeParse('agentskitos://workspace/x').success).toBe(true)
    })
    it('rejects other schemes', () => {
      expect(EventSource.safeParse('https://x.com').success).toBe(false)
    })
  })

  describe('DataSchemaUri', () => {
    it('accepts versioned schema URI', () => {
      expect(DataSchemaUri.safeParse('agentskitos://schema/agent_task/v1').success).toBe(true)
    })
    it('rejects without version', () => {
      expect(DataSchemaUri.safeParse('agentskitos://schema/agent_task').success).toBe(false)
    })
  })

  describe('envelope rejects', () => {
    it('rejects missing required fields', () => {
      const r = safeParseEvent({ ...valid, traceId: undefined })
      expect(r.success).toBe(false)
    })
    it('rejects wrong specversion', () => {
      expect(safeParseEvent({ ...valid, specversion: '2.0' }).success).toBe(false)
    })
    it('rejects bad time format', () => {
      expect(safeParseEvent({ ...valid, time: '2026-05-01' }).success).toBe(false)
    })
    it('throws on parseEvent with invalid input', () => {
      expect(() => parseEvent({})).toThrow()
    })
  })
})
