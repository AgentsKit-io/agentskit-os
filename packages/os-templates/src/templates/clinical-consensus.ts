import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const clinicalConsensusTemplate: Template = {
  id: 'clinical-consensus',
  name: 'Clinical Two-LLM Consensus',
  description:
    'Three diagnostic agents vote on triage suggestion. Disagreement routes to physician HITL gate. Designed for deterministic run-mode + consent.',
  category: 'clinical',
  tags: ['vote', 'hitl', 'consent', 'deterministic', 'safety-of-life'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'diag-a',
      name: 'Diagnostic Agent A',
      systemPrompt:
        'Suggest a triage level (immediate | urgent | routine) based on chief complaint. Output ONLY the label.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0 },
    }),
    parseAgentConfig({
      id: 'diag-b',
      name: 'Diagnostic Agent B',
      systemPrompt:
        'Suggest a triage level (immediate | urgent | routine) based on chief complaint. Output ONLY the label.',
      model: { provider: 'openai', model: 'gpt-4o', temperature: 0 },
    }),
    parseAgentConfig({
      id: 'diag-c',
      name: 'Diagnostic Agent C',
      systemPrompt:
        'Suggest a triage level (immediate | urgent | routine) based on chief complaint. Output ONLY the label.',
      model: { provider: 'gemini', model: 'gemini-pro', temperature: 0 },
    }),
    parseAgentConfig({
      id: 'safety-judge',
      name: 'Safety Judge',
      systemPrompt: 'Pick conservative triage level. When in doubt, escalate.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'clinical-consensus',
      name: 'Clinical Consensus',
      entry: 'vote',
      nodes: [
        {
          id: 'vote',
          kind: 'vote',
          agents: ['diag-a', 'diag-b', 'diag-c'],
          ballot: { mode: 'majority' },
          outputType: 'classification',
          onTie: 'judge',
          judgeAgent: 'safety-judge',
        },
        {
          id: 'physician-review',
          kind: 'human',
          prompt: 'Physician — confirm triage suggestion?',
          approvers: ['physician'],
        },
      ],
      edges: [{ from: 'vote', to: 'physician-review' }],
    }),
  ],
}
