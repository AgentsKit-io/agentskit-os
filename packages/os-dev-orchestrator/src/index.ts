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

export { computeGitDiff } from './git-diff.js'
export type { GitDiffFile, GitDiffHunk, GitDiffResult } from './git-diff.js'
export { computeCompletenessScore, runCodingAgentBenchmark } from './coding-benchmark.js'
export type { CodingBenchmarkReport, CodingBenchmarkRow } from './coding-benchmark.js'
export { runDelegatedCodingTask } from './coding-delegation.js'
export { simulateIssueToPrDryRun } from './issue-pr-pipeline.js'
export type { IssueToPrDryRunReport, IssueToPrPipelineEvent } from './issue-pr-pipeline.js'
export type {
  DelegationReport,
  DelegationSubTaskRow,
  DelegationSubTaskSpec,
  DelegationTraceNode,
  FileConflict,
} from './coding-delegation.js'
