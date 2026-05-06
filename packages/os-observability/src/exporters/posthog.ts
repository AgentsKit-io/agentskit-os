// Per #104 — PostHog SpanExporter adapter (capture endpoint).
// Pure transform + caller-supplied HTTP fetch.

import type { Span, SpanExporter } from '../trace-collector.js'

export type PostHogHttp = (req: {
  readonly url: string
  readonly method: 'POST'
  readonly headers: Record<string, string>
  readonly body: string
}) => Promise<{ readonly status: number }>

export type PostHogExporterOpts = {
  readonly endpoint: string
  readonly apiKey: string
  readonly http: PostHogHttp
  readonly onError?: (err: unknown, span: Span) => void
}

/** Map AgentsKitOS Span → PostHog capture-event payload (#104). */
export const spanToPostHogEvent = (span: Span, apiKey: string): Record<string, unknown> => ({
  api_key: apiKey,
  event: 'agentskit.trace.span',
  distinct_id: span.workspaceId,
  timestamp: span.startedAt,
  properties: {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    kind: span.kind,
    name: span.name,
    durationMs: span.durationMs,
    status: span.status,
    errorCode: span.errorCode,
    errorMessage: span.errorMessage,
    attributes: span.attributes,
  },
})

export const createPostHogExporter = (opts: PostHogExporterOpts): SpanExporter => ({
  async export(span) {
    try {
      const body = JSON.stringify(spanToPostHogEvent(span, opts.apiKey))
      const result = await opts.http({
        url: `${opts.endpoint.replace(/\/$/, '')}/capture/`,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })
      if (result.status >= 400) {
        throw new Error(`posthog capture http ${result.status}`)
      }
    } catch (err) {
      opts.onError?.(err, span)
    }
  },
})
