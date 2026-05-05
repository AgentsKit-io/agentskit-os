import type { AgentNode } from '@agentskit/os-core'
import type { NodeHandlerMap } from '@agentskit/os-flow'
import {
  composeHandlers,
  createAuctionHandler,
  createBlackboardHandler,
  createCompareHandler,
  createDebateHandler,
  createVoteHandler,
  type RunAgentFn,
} from '@agentskit/os-flow'
import type { AgentLookup } from './handlers/agent.js'
import type { AdapterRegistry } from './adapters.js'
import { createAgentHandler } from './handlers/agent.js'
import { createToolHandler } from './handlers/tool.js'
import { createHumanHandler } from './handlers/human.js'
import { createConditionHandler } from './handlers/condition.js'
import { createParallelHandler } from './handlers/parallel.js'

export type LiveHandlerOptions = {
  readonly adapters: AdapterRegistry
  readonly lookupAgent: AgentLookup
}

const fanoutAgentNode = (agentId: string): AgentNode => ({
  kind: 'agent',
  id: 'fanout',
  agent: agentId as AgentNode['agent'],
})

const makeRunAgentFn = (
  lookupAgent: AgentLookup,
  llm: NonNullable<AdapterRegistry['llm']>,
): RunAgentFn => {
  const handler = createAgentHandler(lookupAgent, llm)
  return async (agentId, input, ctx) => {
    const outcome = await handler(fanoutAgentNode(agentId), input, ctx)
    if (outcome.kind === 'ok') {
      return { output: outcome.value }
    }
    if (outcome.kind === 'failed') {
      throw new Error(outcome.error.message)
    }
    throw new Error(`fanout agent run ended as ${outcome.kind}`)
  }
}

export const buildLiveHandlers = (opts: LiveHandlerOptions): NodeHandlerMap => {
  const out: NodeHandlerMap = {}
  if (opts.adapters.llm) {
    ;(out as Record<string, unknown>).agent = createAgentHandler(opts.lookupAgent, opts.adapters.llm)
  }
  if (opts.adapters.tool) {
    ;(out as Record<string, unknown>).tool = createToolHandler(opts.adapters.tool)
  }
  if (opts.adapters.human) {
    ;(out as Record<string, unknown>).human = createHumanHandler(opts.adapters.human)
  }
  ;(out as Record<string, unknown>).condition = createConditionHandler()
  ;(out as Record<string, unknown>).parallel = createParallelHandler()

  if (!opts.adapters.llm) {
    return out
  }

  const runAgent = makeRunAgentFn(opts.lookupAgent, opts.adapters.llm)
  const multi: NodeHandlerMap = {
    compare: createCompareHandler({ runAgent }),
    vote: createVoteHandler({ runAgent }),
    debate: createDebateHandler({ runAgent }),
    auction: createAuctionHandler({ runAgent }),
    blackboard: createBlackboardHandler({ runAgent }),
  }
  return composeHandlers(out, multi)
}
