/**
 * Coding task report builders and serializers (#368).
 *
 * Consumers that import this subpath should add `@agentskit/os-dev-orchestrator`
 * as a dependency (declared optional peer on `@agentskit/os-observability`).
 */
export {
  buildCodingTaskReportFromBenchmark,
  buildCodingTaskReportFromDelegation,
  renderCodingTaskReportMarkdown,
  serializeCodingTaskReportJson,
  toCodingTaskDashboardPayload,
} from '@agentskit/os-dev-orchestrator'
export type {
  BuildCodingTaskReportOptions,
  CodingTaskDashboardPayload,
  CodingTaskReport,
  CodingTaskReportLinks,
  CodingTaskReportRow,
} from '@agentskit/os-dev-orchestrator'
