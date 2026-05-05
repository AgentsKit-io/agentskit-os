import type { NodeHandler } from '@agentskit/os-flow'
import type { AgentConfig } from '@agentskit/os-core'
import type { LlmAdapter } from '../adapters.js'

export type AgentLookup = (id: string) => AgentConfig | undefined

export const createAgentHandler = (
  lookupAgent: AgentLookup,
  llm: LlmAdapter,
): NodeHandler<'agent'> => {
  return async (node, input, ctx) => {
    const agent = lookupAgent(node.agent)
    if (!agent) {
      return {
        kind: 'failed',
        error: { code: 'agent.not_found', message: `agent "${node.agent}" not in workspace` },
      }
    }

    let userContent = ''
    if (typeof input === 'string') userContent = input
    else if (input === undefined) {
      const fallback = node.input !== undefined ? node.input : {}
      userContent = JSON.stringify(fallback)
    } else {
      userContent = JSON.stringify(input)
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }> = []
    if (agent.systemPrompt) {
      messages.push({ role: 'system', content: agent.systemPrompt })
    }
    messages.push({ role: 'user', content: userContent })

    try {
      const llmCall: Parameters<LlmAdapter['invoke']>[0] = {
        system: agent.model.provider,
        model: agent.model.model,
        messages,
      }
      if (agent.model.temperature !== undefined) {
        ;(llmCall as { temperature?: number }).temperature = agent.model.temperature
      }
      if (agent.model.maxTokens !== undefined) {
        ;(llmCall as { maxTokens?: number }).maxTokens = agent.model.maxTokens
      }
      const result = await llm.invoke(llmCall, ctx)
      return { kind: 'ok', value: result.text }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        kind: 'failed',
        error: {
          code: 'agent.llm_failed',
          message,
        },
      }
    }
  }
}
