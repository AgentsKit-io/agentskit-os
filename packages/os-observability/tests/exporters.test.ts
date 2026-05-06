import { describe, expect, it } from 'vitest'
import {
  createLangfuseExporter,
  createPostHogExporter,
  spanToLangfuseEvent,
  spanToPostHogEvent,
} from '../src/index.js'
import type { Span } from '../src/trace-collector.js'

const span: Span = {
  traceId: 'tr1',
  spanId: 'sp1',
  parentSpanId: 'sp0',
  kind: 'agent',
  name: 'researcher',
  workspaceId: 'ws1',
  startedAt: '2026-05-06T12:00:00Z',
  endedAt: '2026-05-06T12:00:01Z',
  durationMs: 1000,
  status: 'ok',
  attributes: { tokens: 42 },
}

describe('Langfuse exporter (#104)', () => {
  it('maps span fields onto Langfuse event', () => {
    const ev = spanToLangfuseEvent(span)
    expect(ev.id).toBe('sp1')
    expect(ev.traceId).toBe('tr1')
    expect(ev.type).toBe('agent')
    expect(ev.level).toBe('DEFAULT')
  })

  it('posts to /api/public/ingestion with basic auth', async () => {
    const calls: { url: string; auth: string }[] = []
    const exporter = createLangfuseExporter({
      endpoint: 'https://lf.example.com',
      publicKey: 'pk',
      secretKey: 'sk',
      http: async (req) => {
        calls.push({ url: req.url, auth: req.headers.authorization! })
        return { status: 200 }
      },
    })
    await exporter.export(span)
    expect(calls[0]?.url).toBe('https://lf.example.com/api/public/ingestion')
    expect(calls[0]?.auth.startsWith('Basic ')).toBe(true)
  })

  it('routes errors to onError without throwing', async () => {
    const errors: unknown[] = []
    const exporter = createLangfuseExporter({
      endpoint: 'https://lf.example.com',
      publicKey: 'pk',
      secretKey: 'sk',
      http: async () => ({ status: 500 }),
      onError: (e) => errors.push(e),
    })
    await exporter.export(span)
    expect(errors).toHaveLength(1)
  })
})

describe('PostHog exporter (#104)', () => {
  it('maps span fields onto capture event', () => {
    const ev = spanToPostHogEvent(span, 'phc_xxx')
    expect(ev.event).toBe('agentskit.trace.span')
    expect(ev.distinct_id).toBe('ws1')
    expect((ev.properties as Record<string, unknown>).traceId).toBe('tr1')
    expect(ev.api_key).toBe('phc_xxx')
  })

  it('posts to /capture/', async () => {
    const calls: { url: string }[] = []
    const exporter = createPostHogExporter({
      endpoint: 'https://app.posthog.com',
      apiKey: 'phc_xxx',
      http: async (req) => {
        calls.push({ url: req.url })
        return { status: 200 }
      },
    })
    await exporter.export(span)
    expect(calls[0]?.url).toBe('https://app.posthog.com/capture/')
  })
})
