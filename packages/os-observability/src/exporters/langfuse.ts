// Per #104 — Langfuse SpanExporter adapter.
// Pure transform + caller-supplied HTTP fetch; no SDK dependency.

import type { Span, SpanExporter } from '../trace-collector.js'

export type LangfuseHttp = (req: {
  readonly url: string
  readonly method: 'POST'
  readonly headers: Record<string, string>
  readonly body: string
}) => Promise<{ readonly status: number }>

export type LangfuseExporterOpts = {
  readonly endpoint: string
  readonly publicKey: string
  readonly secretKey: string
  readonly http: LangfuseHttp
  readonly onError?: (err: unknown, span: Span) => void
}

const basicAuth = (publicKey: string, secretKey: string): string => {
  const token = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')
  return `Basic ${token}`
}

/**
 * Map AgentsKitOS Span → Langfuse trace event payload (#104).
 * Public for tests + advanced callers that pipe spans into custom transports.
 */
export const spanToLangfuseEvent = (span: Span): Record<string, unknown> => ({
  id: span.spanId,
  traceId: span.traceId,
  parentObservationId: span.parentSpanId,
  type: span.kind,
  name: span.name,
  startTime: span.startedAt,
  endTime: span.endedAt,
  metadata: {
    workspaceId: span.workspaceId,
    durationMs: span.durationMs,
    status: span.status,
    ...(span.errorCode !== undefined ? { errorCode: span.errorCode } : {}),
    ...(span.errorMessage !== undefined ? { errorMessage: span.errorMessage } : {}),
    attributes: span.attributes,
  },
  level: span.status === 'error' ? 'ERROR' : 'DEFAULT',
})

export const createLangfuseExporter = (opts: LangfuseExporterOpts): SpanExporter => ({
  async export(span) {
    try {
      const body = JSON.stringify({ events: [spanToLangfuseEvent(span)] })
      const result = await opts.http({
        url: `${opts.endpoint.replace(/\/$/, '')}/api/public/ingestion`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: basicAuth(opts.publicKey, opts.secretKey),
        },
        body,
      })
      if (result.status >= 400) {
        throw new Error(`langfuse ingest http ${result.status}`)
      }
    } catch (err) {
      opts.onError?.(err, span)
    }
  },
})
