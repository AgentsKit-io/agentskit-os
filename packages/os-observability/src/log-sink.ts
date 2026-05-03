// ADR-0016 — pure event-to-log decision logic. Pluggable LogWriter sink.
// EventHandler shape matches os-core's EventBus.subscribe callback so a
// caller wires this with a single bus.subscribe('*', sink) line.

import type { AnyEvent, EventHandler } from '@agentskit/os-core'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogLine = {
  readonly level: LogLevel
  readonly time: string
  readonly type: string
  readonly message: string
  readonly workspaceId: string
  readonly traceId: string
  readonly spanId: string
  readonly eventId: string
  readonly fields: Record<string, unknown>
}

export interface LogWriter {
  write(line: LogLine): void | Promise<void>
}

export type LogSinkOptions = {
  readonly writer: LogWriter
  readonly minLevel?: LogLevel
  readonly classify?: (event: AnyEvent) => LogLevel
  readonly format?: (event: AnyEvent) => string
  readonly extract?: (event: AnyEvent) => Record<string, unknown>
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const ERROR_TYPE_RE = /\.(failed|error|rejected)$/
const WARN_TYPE_RE = /\.(paused|skipped|degraded)$/
const DEBUG_TYPE_RE = /\.(started|created)$/

export const defaultClassify = (event: AnyEvent): LogLevel => {
  if (ERROR_TYPE_RE.test(event.type)) return 'error'
  if (WARN_TYPE_RE.test(event.type)) return 'warn'
  if (DEBUG_TYPE_RE.test(event.type)) return 'debug'
  return 'info'
}

export const defaultFormat = (event: AnyEvent): string => {
  const data = event.data as Record<string, unknown> | undefined
  const msg = data && typeof data['message'] === 'string' ? (data['message'] as string) : event.type
  return msg
}

export const defaultExtract = (event: AnyEvent): Record<string, unknown> => {
  const data = event.data as Record<string, unknown> | undefined
  return data ?? {}
}

export const createLogSink = (opts: LogSinkOptions): EventHandler => {
  const minWeight = LEVEL_WEIGHT[opts.minLevel ?? 'debug']
  const classify = opts.classify ?? defaultClassify
  const format = opts.format ?? defaultFormat
  const extract = opts.extract ?? defaultExtract
  return async (event) => {
    const level = classify(event)
    if (LEVEL_WEIGHT[level] < minWeight) return
    const line: LogLine = {
      level,
      time: event.time,
      type: event.type,
      message: format(event),
      workspaceId: event.workspaceId,
      traceId: event.traceId ?? '',
      spanId: event.spanId ?? '',
      eventId: event.id,
      fields: extract(event),
    }
    await opts.writer.write(line)
  }
}
