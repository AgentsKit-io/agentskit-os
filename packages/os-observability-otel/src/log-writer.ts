// Adapt @agentskit/os-observability LogLine -> OTel Logs SDK shape.
// Structural-typed against @opentelemetry/api-logs.Logger.

import type { LogLine, LogWriter } from '@agentskit/os-observability'

export const OTEL_SEVERITY: Record<LogLine['level'], { number: number; text: string }> = {
  debug: { number: 5, text: 'DEBUG' },
  info: { number: 9, text: 'INFO' },
  warn: { number: 13, text: 'WARN' },
  error: { number: 17, text: 'ERROR' },
}

export type OtelLogRecord = {
  readonly timestamp: number
  readonly severityNumber: number
  readonly severityText: string
  readonly body: string
  readonly attributes: Record<string, unknown>
}

export interface OtelLoggerShape {
  emit(record: OtelLogRecord): void
}

export type OtelLogWriterOptions = {
  readonly logger: OtelLoggerShape
  readonly onError?: (err: unknown, line: LogLine) => void
}

export const toOtelLogRecord = (line: LogLine): OtelLogRecord => {
  const sev = OTEL_SEVERITY[line.level]
  const ts = Date.parse(line.time)
  return {
    timestamp: Number.isFinite(ts) ? ts * 1_000_000 : 0,
    severityNumber: sev.number,
    severityText: sev.text,
    body: line.message,
    attributes: {
      'agentskitos.event.id': line.eventId,
      'agentskitos.event.type': line.type,
      'agentskitos.workspace_id': line.workspaceId,
      'trace.id': line.traceId,
      'span.id': line.spanId,
      ...line.fields,
    },
  }
}

export const createOtelLogWriter = (opts: OtelLogWriterOptions): LogWriter => {
  const onError = opts.onError ?? (() => undefined)
  return {
    write: (line) => {
      try {
        opts.logger.emit(toOtelLogRecord(line))
      } catch (e) {
        onError(e, line)
      }
    },
  }
}
