// Adapt @agentskit/os-observability Span -> OTel SDK SpanExporter shape.
// Structural-typed: matches @opentelemetry/sdk-trace-base.SpanExporter
// without importing it. Users wire any concrete OTel exporter.

import type { Span, SpanExporter, SpanStatus } from '@agentskit/os-observability'

export type OtelTraceFlags = number

export type OtelSpanContext = {
  readonly traceId: string
  readonly spanId: string
  readonly traceFlags: OtelTraceFlags
}

export const OTEL_SPAN_KIND_INTERNAL = 0 as const
export const OTEL_SPAN_STATUS_UNSET = 0 as const
export const OTEL_SPAN_STATUS_OK = 1 as const
export const OTEL_SPAN_STATUS_ERROR = 2 as const

export type OtelSpanStatusCode =
  | typeof OTEL_SPAN_STATUS_UNSET
  | typeof OTEL_SPAN_STATUS_OK
  | typeof OTEL_SPAN_STATUS_ERROR

export type OtelReadableSpan = {
  readonly name: string
  readonly kind: number
  readonly spanContext: () => OtelSpanContext
  readonly parentSpanId?: string
  readonly startTime: readonly [number, number]
  readonly endTime: readonly [number, number]
  readonly status: { readonly code: OtelSpanStatusCode; readonly message?: string }
  readonly attributes: Record<string, unknown>
  readonly resource: { readonly attributes: Record<string, unknown> }
  readonly instrumentationScope: { readonly name: string; readonly version?: string }
}

export type OtelExportResult = { readonly code: 0 } | { readonly code: 1; readonly error?: Error }

export interface OtelSpanExporterShape {
  export(spans: readonly OtelReadableSpan[], cb: (r: OtelExportResult) => void): void
  shutdown(): Promise<void>
}

export type OtelSpanExporterAdapterOptions = {
  readonly target: OtelSpanExporterShape
  readonly serviceName?: string
  readonly serviceVersion?: string
  readonly batchSize?: number
  readonly onError?: (err: unknown, span: Span) => void
}

const DEFAULT_BATCH = 16
const DEFAULT_SERVICE = 'agentskitos'

const isoToHrTime = (iso: string): readonly [number, number] => {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return [0, 0]
  const seconds = Math.floor(ms / 1000)
  const nanos = (ms % 1000) * 1_000_000
  return [seconds, nanos]
}

const statusOf = (status: SpanStatus): { code: OtelSpanStatusCode; message?: string } => {
  switch (status) {
    case 'ok':
      return { code: OTEL_SPAN_STATUS_OK }
    case 'error':
      return { code: OTEL_SPAN_STATUS_ERROR, message: 'span.status=error' }
    case 'paused':
    case 'skipped':
    case 'cancelled':
      return { code: OTEL_SPAN_STATUS_UNSET, message: status }
  }
}

export const toOtelSpan = (
  span: Span,
  service: { name: string; version?: string },
): OtelReadableSpan => {
  const ctx: OtelSpanContext = {
    traceId: span.traceId,
    spanId: span.spanId,
    traceFlags: 1,
  }
  const attributes: Record<string, unknown> = {
    'agentskitos.kind': span.kind,
    'agentskitos.workspace_id': span.workspaceId,
    ...span.attributes,
  }
  if (span.errorCode) attributes['agentskitos.error.code'] = span.errorCode
  if (span.errorMessage) attributes['agentskitos.error.message'] = span.errorMessage
  const resourceAttrs: Record<string, unknown> = {
    'service.name': service.name,
  }
  if (service.version !== undefined) resourceAttrs['service.version'] = service.version

  const instrumentationScope: { name: string; version?: string } = {
    name: '@agentskit/os-observability',
  }
  if (service.version !== undefined) instrumentationScope.version = service.version

  const out: OtelReadableSpan = {
    name: span.name,
    kind: OTEL_SPAN_KIND_INTERNAL,
    spanContext: () => ctx,
    startTime: isoToHrTime(span.startedAt),
    endTime: isoToHrTime(span.endedAt),
    status: statusOf(span.status),
    attributes,
    resource: {
      attributes: resourceAttrs,
    },
    instrumentationScope,
  }
  if (span.parentSpanId !== undefined) {
    ;(out as { parentSpanId?: string }).parentSpanId = span.parentSpanId
  }
  return out
}

export const createOtelSpanExporter = (
  opts: OtelSpanExporterAdapterOptions,
): SpanExporter & { flush: () => Promise<void>; shutdown: () => Promise<void> } => {
  const buf: OtelReadableSpan[] = []
  let limit = DEFAULT_BATCH
  if (opts.batchSize !== undefined) limit = opts.batchSize

  const onError = opts.onError !== undefined ? opts.onError : () => undefined

  let serviceName = DEFAULT_SERVICE
  if (opts.serviceName !== undefined) serviceName = opts.serviceName
  const service: { name: string; version?: string } = { name: serviceName }
  if (opts.serviceVersion !== undefined) service.version = opts.serviceVersion

  const flush = async (): Promise<void> => {
    if (buf.length === 0) return
    const chunk = buf.splice(0, buf.length)
    await new Promise<void>((res) => {
      try {
        opts.target.export(chunk, (r) => {
          if (r.code !== 0 && r.error) onError(r.error, chunk[0] as unknown as Span)
          res()
        })
      } catch (e) {
        onError(e, chunk[0] as unknown as Span)
        res()
      }
    })
  }

  return {
    export: (span) => {
      buf.push(toOtelSpan(span, service))
      if (buf.length >= limit) {
        // best-effort fire-and-forget; embedders should call flush() before shutdown
        void flush()
      }
    },
    flush,
    shutdown: () => opts.target.shutdown(),
  }
}
