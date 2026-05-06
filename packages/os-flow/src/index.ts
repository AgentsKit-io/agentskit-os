export {
  buildAdjacency,
  reachableFrom,
  findUnreachable,
  topoSort,
  auditGraph,
  nodeKindOf,
} from './topo.js'
export type { Adjacency, AdjacencyEntry, EdgeOn, GraphIssue } from './topo.js'

export { composeHandlers, defaultStubHandlers } from './handlers.js'
export type { NodeHandler, NodeHandlerMap, NodeOutcome } from './handlers.js'

export { runFlow } from './runner.js'
export type { RunResult, RunOptions, CheckpointFn } from './runner.js'
export type { FlowCostTickEvent } from './flow-observability-events.js'

export { createCircuitBreaker } from './circuit-breaker.js'
export type {
  CircuitBreaker,
  CircuitBreakerOpts,
  CircuitBreakerSnapshot,
  CircuitState,
} from './circuit-breaker.js'
export { cancelOnBudget, createFlowCostMeter } from './flow-cost-meter.js'
export { evaluateFlowWatchdog } from './flow-watchdog.js'
export type {
  FlowWatchdogOpts,
  RunHeartbeat,
  WatchdogAction,
  WatchdogVerdict,
} from './flow-watchdog.js'
export { runWithGracefulDegradation } from './graceful-degradation.js'
export { detectHotReloadConflicts } from './hot-reload-conflicts.js'
export { runUnderChaos } from './chaos-harness.js'
export type { ChaosFault, ChaosOutcome, ChaosPlan, ChaosRule } from './chaos-harness.js'
export type { HotReloadConflict, HotReloadRunSnapshot } from './hot-reload-conflicts.js'
export type {
  DegradationAttempt,
  DegradationOpts,
  DegradationOutcome,
  DegradationReport,
} from './graceful-degradation.js'
export type {
  FlowCostMeter,
  FlowCostMeterOpts,
  FlowCostMeterUpdate,
} from './flow-cost-meter.js'

export { applyModeStubs, validateDeterministicFlow, policyForMode } from './mode-policy.js'
export type {
  AgentRegistryEntry,
  ToolRegistryEntry,
  DeterminismValidationInput,
} from './mode-policy.js'

export { InMemoryCheckpointStore, resumeFlow } from './durable.js'
export type {
  CheckpointStore,
  CheckpointRecord,
  DurableRunResult,
  ResumeOptions,
} from './durable.js'

export { createBusOnEvent, FLOW_EVENT_TYPES } from './bus-bridge.js'
export type { BridgeOptions, BridgeEvent, FlowEventType } from './bus-bridge.js'

export { createPolicyToolHandler, InMemoryToolManifestRegistry } from './tool-policy.js'
export type {
  ToolManifestRegistry,
  ToolPolicyDecisionEvent,
  PolicyToolHandlerOptions,
} from './tool-policy.js'

export { estimateFlowCost, priceKey } from './cost-estimator.js'
export type {
  NodeCostEstimate,
  FlowCostEstimate,
  AgentMap,
  PriceMap,
  EstimateOptions,
} from './cost-estimator.js'

export {
  createCompareHandler,
  createVoteHandler,
  createDebateHandler,
  createAuctionHandler,
  createBlackboardHandler,
  InMemoryScratchpadStore,
} from './multi-agent-handlers.js'
export type {
  AgentRunResult,
  RunAgentFn,
  ScratchpadStore,
  CompareEvalFn,
  CompareJudgeFn,
  CompareHandlerOptions,
  VoteJudgeFn,
  VoteHandlerOptions,
  DebateHandlerOptions,
  AuctionScorerFn,
  AuctionHandlerOptions,
  BlackboardHandlerOptions,
} from './multi-agent-handlers.js'

// #205 — event-sourced RunSnapshot
export { captureSnapshot, outcomesFromSnapshot, buildSnapshotEmitter, RunSnapshot } from './snapshot.js'
export type { RunSnapshot as RunSnapshotType, SnapshotInput, SnapshotOptions } from './snapshot.js'

// #206 — branch-from-past-step replay
export { branchFromSnapshot, FlowBranchError } from './branch.js'
export type { BranchFromSnapshotOptions, BranchResult, BranchOverride } from './branch.js'

// #64 — live debugger primitives
export { createInMemoryDebugger, DebuggerMode, DebuggerState } from './debugger.js'
export type {
  DebuggerAfterNodeInput,
  DebuggerBeforeNodeDecision,
  DebuggerBeforeNodeInput,
  FlowDebugger,
  NodeId,
} from './debugger.js'

// #188 — two-person HITL approval
export { createHumanHandler } from './human-handler.js'
export type { ApproverGate, ApproverGateDecision, HumanHandlerOptions } from './human-handler.js'

// #172 — semantic flow diff renderer
export { diffFlowSemantics, renderFlowDiffMarkdown } from './flow-diff.js'
export type { FlowSemanticDiff, FlowNodeChange, FlowEdgeChange } from './flow-diff.js'

// #193 — built-in diff-as-input primitive
export {
  GIT_DIFF_TOOL_NAME,
  GitDiffToolInput,
  GitDiffLine,
  GitDiffHunk,
  GitDiffFile,
  GitDiffResult,
  createGitDiffNodeHandler,
  createGitDiffToolCall,
  parseUnifiedGitDiff,
  parseGitDiffToolInput,
  safeParseGitDiffToolInput,
} from './git-diff-tool.js'
export type { GitDiffExecutor, GitDiffNodeHandler } from './git-diff-tool.js'
export type { GitDiffToolCall } from './git-diff-tool.js'

export const PACKAGE_NAME = '@agentskit/os-flow' as const
export const PACKAGE_VERSION = '0.0.0' as const
