// Node handler contract per ADR-0009 RunMode × SideEffect policy.
// Pure interfaces — concrete implementations injected by host.

import type { FlowNode, RunContext } from '@agentskit/os-core'

export type NodeOutcome =
  | { kind: 'ok'; value: unknown }
  | { kind: 'failed'; error: { code: string; message: string } }
  | { kind: 'paused'; reason: 'hitl' | 'budget' | 'consent' | 'cancelled' }
  | { kind: 'skipped'; reason: 'preview' | 'replay' | 'dry_run' | 'simulate' }

export type NodeHandler<K extends FlowNode['kind'] = FlowNode['kind']> = (
  node: Extract<FlowNode, { kind: K }>,
  input: unknown,
  ctx: RunContext,
) => Promise<NodeOutcome>

export type NodeHandlerMap = {
  readonly [K in FlowNode['kind']]?: NodeHandler<K>
}

export const composeHandlers = (...maps: readonly NodeHandlerMap[]): NodeHandlerMap => {
  const out: Record<string, NodeHandler> = {}
  for (const m of maps) {
    for (const [k, h] of Object.entries(m)) {
      if (h) out[k] = h as NodeHandler
    }
  }
  return out as NodeHandlerMap
}

const noopOk = (async () => ({ kind: 'ok', value: null }) as NodeOutcome) as unknown as NodeHandler
const makeSkip = (reason: 'preview' | 'replay' | 'dry_run' | 'simulate') =>
  (async () => ({ kind: 'skipped', reason }) as NodeOutcome) as unknown as NodeHandler

export const defaultStubHandlers = (
  reason: 'preview' | 'replay' | 'dry_run' | 'simulate',
): NodeHandlerMap => {
  const skip = makeSkip(reason)
  return {
    agent: skip as unknown as NodeHandler<'agent'>,
    tool: skip as unknown as NodeHandler<'tool'>,
    human: skip as unknown as NodeHandler<'human'>,
    condition: noopOk as unknown as NodeHandler<'condition'>,
    parallel: noopOk as unknown as NodeHandler<'parallel'>,
    compare: skip as unknown as NodeHandler<'compare'>,
    vote: skip as unknown as NodeHandler<'vote'>,
    debate: skip as unknown as NodeHandler<'debate'>,
    auction: skip as unknown as NodeHandler<'auction'>,
    blackboard: skip as unknown as NodeHandler<'blackboard'>,
  }
}
