export {
  createCodingAgentWorktreeManager,
  createDevOrchestratorWorktreeManager,
  defaultGitRunner,
} from './git-worktree-manager.js'
export type {
  CodingAgentWorktreeCreateInput,
  CodingAgentWorktreeManager,
  DevOrchestratorWorktreeManager,
  GitRunner,
  GitRunResult,
  WorktreeAddInput,
  WorktreeCleanupOutcome,
  WorktreeTaskMeta,
} from './git-worktree-manager.js'

export { computeGitDiff, formatUnifiedDiffPreview } from './git-diff.js'
export type { GitDiffFile, GitDiffHunk, GitDiffResult } from './git-diff.js'
export { computeCompletenessScore, runCodingAgentBenchmark } from './coding-benchmark.js'
export type {
  CodingBenchmarkArtifactsOpts,
  CodingBenchmarkReport,
  CodingBenchmarkRow,
} from './coding-benchmark.js'
export {
  artifactFilenameForBenchmarkStep,
  artifactFilenameForDelegationStep,
  buildCodingRunArtifactPayload,
  collectGitHeadDiffSnapshot,
  redactCodingTaskRequest,
  redactCodingTaskResult,
  resolveHeadOidSafe,
  summarizeGitDiffForArtifact,
  tryGitRefDiffSummary,
  writeCodingRunArtifactFile,
} from './coding-run-artifacts.js'
export type {
  CodingAgentArtifactIds,
  CodingRunArtifactPayload,
  CodingRunArtifactPhase,
  CodingRunArtifactsOpts,
  CodingRunGitRefDiffSummary,
} from './coding-run-artifacts.js'
export {
  CODING_FAILURE_CATALOG,
  buildCodingFailureIncidentRecord,
  classifyCodingFailure,
} from './coding-failure-taxonomy.js'
export type {
  CodingFailureClassification,
  CodingFailureCode,
  CodingFailureIncidentRecord,
  CodingRecoveryAction,
  FailureSeverity,
  RetryPolicy,
} from './coding-failure-taxonomy.js'
export {
  buildCodingTaskReportFromBenchmark,
  buildCodingTaskReportFromDelegation,
  renderCodingTaskReportMarkdown,
  serializeCodingTaskReportJson,
  toCodingTaskDashboardPayload,
} from './coding-task-report.js'
export type {
  BuildCodingTaskReportOptions,
  CodingTaskDashboardPayload,
  CodingTaskReport,
  CodingTaskReportLinks,
  CodingTaskReportRow,
} from './coding-task-report.js'
export {
  CODING_PERMISSION_PROFILES,
  buildCodingPermissionAuditEvent,
  evaluateCodingPermission,
  getCodingPermissionProfile,
  listCodingPermissionProfiles,
} from './coding-permission-profiles.js'
export type {
  CodingGitOps,
  CodingNetworkPolicy,
  CodingOperation,
  CodingPermissionAuditEvent,
  CodingPermissionDecision,
  CodingPermissionProfile,
  CodingPermissionProfileId,
} from './coding-permission-profiles.js'
export { runDelegatedCodingTask } from './coding-delegation.js'
export { runIssueToPrPipeline, simulateIssueToPrDryRun } from './issue-pr-pipeline.js'
export type {
  IssueToPrDryRunReport,
  IssueToPrLiveReport,
  IssueToPrPipelineEvent,
  IssueToPrPipelineReport,
  IssueToPrPrDraftMeta,
} from './issue-pr-pipeline.js'
export type {
  DelegationArtifactsOpts,
  DelegationReport,
  DelegationSubTaskRow,
  DelegationSubTaskSpec,
  DelegationTraceNode,
  FileConflict,
} from './coding-delegation.js'

export {
  DEV_TRIGGER_PRESETS,
  getDevTriggerPreset,
  listDevTriggerPresets,
  mapDevTriggerPresetToTaskInput,
} from './dev-trigger-presets.js'
export type {
  DevTriggerAuthExpectation,
  DevTriggerKind,
  DevTriggerPermissionProfile,
  DevTriggerPreset,
  DevTriggerPresetMapInput,
  DevTriggerPresetMapResult,
  DevTriggerRunMode,
} from './dev-trigger-presets.js'
