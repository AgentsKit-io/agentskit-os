import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const researchSummaryTemplate: Template = {
  id: 'research-summary',
  name: 'Research Summary',
  description:
    'Web search → researcher agent → critic agent (validates claims) → final summarizer. Demonstrates RAG + multi-agent review.',
  category: 'research',
  tags: ['rag', 'web-search', 'critic', 'summarize'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'researcher',
      name: 'Researcher',
      systemPrompt: 'You synthesize sources into structured findings with citations.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.3 },
    }),
    parseAgentConfig({
      id: 'critic',
      name: 'Critic',
      systemPrompt: 'You validate claims against sources. Flag any unsupported assertion.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0 },
    }),
    parseAgentConfig({
      id: 'summarizer',
      name: 'Summarizer',
      systemPrompt: 'Produce a tight 200-word summary suitable for an executive audience.',
      model: { provider: 'openai', model: 'gpt-4o', temperature: 0.4 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'research-summary',
      name: 'Research Summary',
      entry: 'search',
      nodes: [
        { id: 'search', kind: 'tool', tool: 'web.search' },
        { id: 'research', kind: 'agent', agent: 'researcher' },
        { id: 'critique', kind: 'agent', agent: 'critic' },
        { id: 'summarize', kind: 'agent', agent: 'summarizer' },
      ],
      edges: [
        { from: 'search', to: 'research' },
        { from: 'research', to: 'critique' },
        { from: 'critique', to: 'summarize' },
      ],
    }),
  ],
}
