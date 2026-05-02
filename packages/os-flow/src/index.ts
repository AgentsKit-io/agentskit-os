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

export const PACKAGE_NAME = '@agentskit/os-flow' as const
export const PACKAGE_VERSION = '0.0.0' as const
