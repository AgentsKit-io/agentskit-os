import type { NodeHandlerMap } from '@agentskit/os-flow'
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
  return out
}
