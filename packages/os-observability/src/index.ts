export {
  createLogSink,
  defaultClassify,
  defaultFormat,
  defaultExtract,
} from './log-sink.js'
export type {
  LogLevel,
  LogLine,
  LogWriter,
  LogSinkOptions,
} from './log-sink.js'

export { consoleLogWriter } from './console-writer.js'
export type { ConsoleLogWriterOptions } from './console-writer.js'

export { replayEvents } from './replay.js'

export {
  createTraceCollector,
  defaultClassifyLifecycle,
  defaultKindOf,
  defaultNameOf,
} from './trace-collector.js'
export type {
  Span,
  SpanExporter,
  SpanKind,
  SpanStatus,
  SpanLifecycle,
  TraceCollectorOptions,
} from './trace-collector.js'

export { InMemorySpanExporter } from './in-memory-span-exporter.js'

export {
  createMetricsRegistry,
  eventCountRule,
  durationRule,
  costRule,
  DEFAULT_METRIC_RULES,
} from './metrics-registry.js'
export type {
  MetricKind,
  MetricPoint,
  MetricSink,
  MetricRule,
  MetricsRegistryOptions,
} from './metrics-registry.js'

export { InMemoryMetricSink } from './in-memory-metric-sink.js'
export type { Agg, CounterAgg, GaugeAgg, HistogramAgg } from './in-memory-metric-sink.js'

export const PACKAGE_NAME = '@agentskit/os-observability' as const
export const PACKAGE_VERSION = '0.0.0' as const
