import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const marketing3WayTemplate: Template = {
  id: 'marketing-3way-compare',
  name: 'Marketing Copy 3-Way Compare',
  description:
    'Three copywriter agents (different voices) generate alternatives in parallel. Judge agent picks winner against brand kit.',
  category: 'marketing',
  tags: ['copywriting', 'a-b-test', 'compare-node', 'brand-kit'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'copy-formal',
      name: 'Formal Copywriter',
      systemPrompt: 'Write formal, polished marketing copy.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.7 },
    }),
    parseAgentConfig({
      id: 'copy-playful',
      name: 'Playful Copywriter',
      systemPrompt: 'Write playful, witty marketing copy with personality.',
      model: { provider: 'openai', model: 'gpt-4o', temperature: 0.9 },
    }),
    parseAgentConfig({
      id: 'copy-technical',
      name: 'Technical Copywriter',
      systemPrompt: 'Write precise, fact-driven marketing copy that engineers respect.',
      model: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.4 },
    }),
    parseAgentConfig({
      id: 'brand-judge',
      name: 'Brand Judge',
      systemPrompt:
        'Pick the variant that best matches brand voice. Reject any with banned phrases. Output ONLY the chosen variant.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'marketing-3way',
      name: 'Marketing 3-Way Compare',
      entry: 'compare',
      nodes: [
        {
          id: 'compare',
          kind: 'compare',
          agents: ['copy-formal', 'copy-playful', 'copy-technical'],
          selection: { mode: 'judge', judgeAgent: 'brand-judge', criteria: 'best brand voice + no banned phrases' },
        },
      ],
      edges: [],
    }),
  ],
}
