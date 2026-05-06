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

export {
  costEntryToMetricPoints,
  createCostMetricsRecorder,
} from './cost-bridge.js'
export type {
  CostEntryShape,
  CostBridgeLabels,
  CostMetricsRecorderOptions,
} from './cost-bridge.js'

export {
  applyIncidentTransition,
  buildIncidentAuditExport,
  createAgentIncident,
  renderIncidentMarkdown,
} from './agent-incident.js'
export type {
  AgentIncident,
  CreateAgentIncidentInput,
  IncidentAuditExport,
  IncidentCustomerImpact,
  IncidentLink,
  IncidentRcaNotes,
  IncidentRollbackAction,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEntry,
  IncidentTransition,
} from './agent-incident.js'

export {
  createSubstringRedactor,
  getRedactionProfile,
  REDACTION_PROFILES,
} from './redaction-profiles.js'
export type {
  RedactionProfile,
  RedactionProfileId,
} from './redaction-profiles.js'

export { applyFieldRedaction } from './field-redaction.js'
export type {
  FieldRedactionConfig,
  FieldRedactor,
  FieldSelector,
} from './field-redaction.js'

export { createLangfuseExporter, spanToLangfuseEvent } from './exporters/langfuse.js'
export type { LangfuseExporterOpts, LangfuseHttp } from './exporters/langfuse.js'
export { createPostHogExporter, spanToPostHogEvent } from './exporters/posthog.js'
export type { PostHogExporterOpts, PostHogHttp } from './exporters/posthog.js'

export { buildCostHeatMap, totalCostForTag } from './cost-heat-map.js'
export { replayBisect } from './replay-bisect.js'
export type { BisectOpts, BisectVerdict, ReplayOracle } from './replay-bisect.js'

export {
  ANOMALY_PRESET_IDS,
  BUILTIN_ANOMALY_RULES,
  defaultAnomalyRuleSet,
  getAnomalyPreset,
} from './anomaly-presets.js'
export type { AnomalyPresetId } from './anomaly-presets.js'
export type {
  CostHeatCell,
  CostHeatMap,
  CostHeatSample,
  HeatMapBucket,
} from './cost-heat-map.js'

export { buildDecisionLogEntry, filterDecisionLog } from './decision-log.js'
export type {
  DecisionAlternative,
  DecisionLogEntry,
  DecisionLogInput,
  DecisionLogQuery,
} from './decision-log.js'

export const PACKAGE_NAME = '@agentskit/os-observability' as const
export const PACKAGE_VERSION = '0.0.0' as const
