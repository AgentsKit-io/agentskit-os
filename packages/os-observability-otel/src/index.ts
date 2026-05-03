export {
  createOtelSpanExporter,
  toOtelSpan,
  OTEL_SPAN_KIND_INTERNAL,
  OTEL_SPAN_STATUS_UNSET,
  OTEL_SPAN_STATUS_OK,
  OTEL_SPAN_STATUS_ERROR,
} from './span-exporter.js'
export type {
  OtelSpanContext,
  OtelTraceFlags,
  OtelSpanStatusCode,
  OtelReadableSpan,
  OtelExportResult,
  OtelSpanExporterShape,
  OtelSpanExporterAdapterOptions,
} from './span-exporter.js'

export {
  createOtelLogWriter,
  toOtelLogRecord,
  OTEL_SEVERITY,
} from './log-writer.js'
export type {
  OtelLoggerShape,
  OtelLogRecord,
  OtelLogWriterOptions,
} from './log-writer.js'

export { createOtelMetricSink } from './metric-sink.js'
export type {
  OtelMeterShape,
  OtelCounter,
  OtelHistogram,
  OtelMetricSinkOptions,
} from './metric-sink.js'

export const PACKAGE_NAME = '@agentskit/os-observability-otel' as const
export const PACKAGE_VERSION = '0.0.0' as const
