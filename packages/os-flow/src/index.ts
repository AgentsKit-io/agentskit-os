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

export const PACKAGE_NAME = '@agentskit/os-flow' as const
export const PACKAGE_VERSION = '0.0.0' as const
