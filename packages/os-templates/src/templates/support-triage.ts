import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const supportTriageTemplate: Template = {
  id: 'support-triage',
  name: 'Customer Support Triage',
  description:
    'Classifier routes incoming ticket to billing, tech, or escalation. HITL gate for escalations. Demonstrates condition node + human-in-loop.',
  category: 'support',
  tags: ['routing', 'condition', 'hitl', 'classification'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'classifier',
      name: 'Triage Classifier',
      systemPrompt:
        'Classify the ticket as: billing | tech | escalate. Output ONLY the lowercase label.',
      model: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', temperature: 0 },
    }),
    parseAgentConfig({
      id: 'billing-rep',
      name: 'Billing Rep',
      systemPrompt: 'Resolve billing questions. Reference the customer record.',
      model: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    }),
    parseAgentConfig({
      id: 'tech-rep',
      name: 'Technical Rep',
      systemPrompt: 'Diagnose technical issues. Provide step-by-step troubleshooting.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.2 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'support-triage',
      name: 'Support Triage',
      entry: 'classify',
      nodes: [
        { id: 'classify', kind: 'agent', agent: 'classifier' },
        { id: 'is-escalate', kind: 'condition', expression: "label == 'escalate'" },
        { id: 'human-gate', kind: 'human', prompt: 'Approve escalation to senior support?' },
        { id: 'billing', kind: 'agent', agent: 'billing-rep' },
        { id: 'tech', kind: 'agent', agent: 'tech-rep' },
      ],
      edges: [
        { from: 'classify', to: 'is-escalate' },
        { from: 'is-escalate', to: 'human-gate', on: 'true' },
        { from: 'is-escalate', to: 'billing', on: 'false' },
        { from: 'is-escalate', to: 'tech', on: 'false' },
      ],
    }),
  ],
}
