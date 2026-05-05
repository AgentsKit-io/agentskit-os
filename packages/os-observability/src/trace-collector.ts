// ADR-0016 — span tree builder. Reads node lifecycle events from the
// EventBus (started → completed/failed/skipped) and emits finished
// spans to a pluggable SpanExporter.
//
// Pure decision logic: no IO beyond exporter.export. Open spans live
// in an in-process Map keyed by traceId+spanId. Lossy at the exporter:
// thrown errors are swallowed via a sink — telemetry must never block
// agent execution.

import type { AnyEvent, EventHandler } from '@agentskit/os-core'

export type SpanKind = 'flow' | 'agent' | 'tool' | 'human' | 'unknown'

export type SpanStatus = 'ok' | 'error' | 'skipped' | 'paused' | 'cancelled'

export type Span = {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly kind: SpanKind
  readonly name: string
  readonly workspaceId: string
  readonly startedAt: string
  readonly endedAt: string
  readonly durationMs: number
  readonly status: SpanStatus
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly attributes: Record<string, unknown>
}

export interface SpanExporter {
  export(span: Span): void | Promise<void>
}

export type TraceCollectorOptions = {
  readonly exporter: SpanExporter
  readonly classify?: (event: AnyEvent) => SpanLifecycle | undefined
  readonly kindOf?: (event: AnyEvent) => SpanKind
  readonly nameOf?: (event: AnyEvent) => string
  readonly onError?: (err: unknown, event: AnyEvent) => void
}

export type SpanLifecycle = 'start' | 'end:ok' | 'end:error' | 'end:skipped' | 'end:paused'

const STARTED_RE = /\.(started|created)$/
const FAILED_RE = /\.(failed|error|rejected)$/
const SKIPPED_RE = /\.skipped$/
const PAUSED_RE = /\.paused$/
const COMPLETED_RE = /\.(completed|resumed)$/

export const defaultClassifyLifecycle = (event: AnyEvent): SpanLifecycle | undefined => {
  if (STARTED_RE.test(event.type)) return 'start'
  if (FAILED_RE.test(event.type)) return 'end:error'
  if (SKIPPED_RE.test(event.type)) return 'end:skipped'
  if (PAUSED_RE.test(event.type)) return 'end:paused'
  if (COMPLETED_RE.test(event.type)) return 'end:ok'
  return undefined
}

const KIND_PREFIX: ReadonlyArray<readonly [string, SpanKind]> = [
  ['flow.', 'flow'],
  ['agent.', 'agent'],
  ['tool.', 'tool'],
  ['human.', 'human'],
]

export const defaultKindOf = (event: AnyEvent): SpanKind => {
  for (const [prefix, kind] of KIND_PREFIX) {
    if (event.type.startsWith(prefix)) return kind
  }
  return 'unknown'
}

export const defaultNameOf = (event: AnyEvent): string => event.type

type OpenSpan = {
  traceId: string
  spanId: string
  parentSpanId?: string
  kind: SpanKind
  name: string
  workspaceId: string
  startedAt: string
  attributes: Record<string, unknown>
}

const spanKey = (traceId: string, spanId: string): string => `${traceId}\x00${spanId}`

const dataAttrs = (event: AnyEvent): Record<string, unknown> => {
  const data = event.data as Record<string, unknown> | undefined
  if (data) return data
  return {}
}

const errorPair = (event: AnyEvent): { code: string | undefined; message: string | undefined } => {
  const data = event.data as Record<string, unknown> | undefined
  if (!data) return { code: undefined, message: undefined }
  const codeRaw = data['errorCode']
  const messageRaw = data['errorMessage']
  let code: string | undefined
  let message: string | undefined
  if (typeof codeRaw === 'string') code = codeRaw
  if (typeof messageRaw === 'string') message = messageRaw
  return { code, message }
}

const lifecycleStatus: Record<Exclude<SpanLifecycle, 'start'>, SpanStatus> = {
  'end:ok': 'ok',
  'end:error': 'error',
  'end:skipped': 'skipped',
  'end:paused': 'paused',
}

export const createTraceCollector = (opts: TraceCollectorOptions): EventHandler => {
  const open = new Map<string, OpenSpan>()
  const classify = opts.classify !== undefined ? opts.classify : defaultClassifyLifecycle
  const kindOf = opts.kindOf !== undefined ? opts.kindOf : defaultKindOf
  const nameOf = opts.nameOf !== undefined ? opts.nameOf : defaultNameOf
  const onError = opts.onError !== undefined ? opts.onError : () => undefined

  const handleStart = (event: AnyEvent, key: string): void => {
    const data = event.data as Record<string, unknown> | undefined
    let parentSpanId: string | undefined
    if (data && typeof data['parentSpanId'] === 'string') parentSpanId = data['parentSpanId'] as string

    const span: OpenSpan = {
      traceId: event.traceId as string,
      spanId: event.spanId as string,
      kind: kindOf(event),
      name: nameOf(event),
      workspaceId: event.workspaceId,
      startedAt: event.time,
      attributes: dataAttrs(event),
    }
    if (parentSpanId !== undefined) span.parentSpanId = parentSpanId
    open.set(key, span)
  }

  const handleEnd = async (
    event: AnyEvent,
    key: string,
    lifecycle: Exclude<SpanLifecycle, 'start'>,
  ): Promise<void> => {
    const existing = open.get(key)
    if (!existing) return
    open.delete(key)

    const status = lifecycleStatus[lifecycle]
    const startedMs = Date.parse(existing.startedAt)
    const endedMs = Date.parse(event.time)
    let durationMs = 0
    if (Number.isFinite(startedMs) && Number.isFinite(endedMs)) {
      durationMs = Math.max(0, endedMs - startedMs)
    }

    let span: Span = {
      traceId: existing.traceId,
      spanId: existing.spanId,
      kind: existing.kind,
      name: existing.name,
      workspaceId: existing.workspaceId,
      startedAt: existing.startedAt,
      endedAt: event.time,
      durationMs,
      status,
      attributes: { ...existing.attributes, ...dataAttrs(event) },
    }
    if (existing.parentSpanId !== undefined) {
      span = { ...span, parentSpanId: existing.parentSpanId }
    }

    if (status === 'error') {
      const err = errorPair(event)
      if (err.code !== undefined) span = { ...span, errorCode: err.code }
      if (err.message !== undefined) span = { ...span, errorMessage: err.message }
    }

    try {
      await opts.exporter.export(span)
    } catch (e) {
      onError(e, event)
    }
  }

  return async (event) => {
    const lifecycle = classify(event)
    if (!lifecycle) return
    const traceId = typeof event.traceId === 'string' ? event.traceId : ''
    const spanId = typeof event.spanId === 'string' ? event.spanId : ''
    if (!traceId || !spanId) return
    const key = spanKey(traceId, spanId)

    if (lifecycle === 'start') {
      handleStart(event, key)
      return
    }
    await handleEnd(event, key, lifecycle)
  }
}
