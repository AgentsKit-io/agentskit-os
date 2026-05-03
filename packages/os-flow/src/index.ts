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

export const PACKAGE_NAME = '@agentskit/os-flow' as const
export const PACKAGE_VERSION = '0.0.0' as const
