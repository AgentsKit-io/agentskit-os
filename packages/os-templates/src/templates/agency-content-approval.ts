// Per #197 — agency-client content approval template.
// Pure: agent + flow definitions parsed via os-core schemas.

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const agencyContentApprovalTemplate: Template = {
  id: 'agency-content-approval',
  name: 'Agency Client Content Approval',
  description:
    'Account manager agent drafts a brief; senior copywriter expands; HITL human approval gate routes the result back to the client agent.',
  category: 'marketing',
  tags: ['agency', 'content', 'approval', 'hitl'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'account-manager',
      name: 'Account Manager',
      systemPrompt:
        'You are an agency account manager. Translate the client brief into a concrete content request with target audience, tone, and CTAs.',
      model: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.3 },
    }),
    parseAgentConfig({
      id: 'senior-copywriter',
      name: 'Senior Copywriter',
      systemPrompt:
        'Expand the request into the full deliverable (caption, body, alternates). Stay within brand voice; flag any compliance risk.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.6 },
    }),
    parseAgentConfig({
      id: 'client-success',
      name: 'Client Success',
      systemPrompt:
        'Format the approved deliverable for client delivery (subject + summary + asset block). No new claims.',
      model: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'agency-approval-flow',
      name: 'Agency Content Approval',
      entry: 'brief',
      nodes: [
        { id: 'brief', kind: 'agent', agent: 'account-manager' },
        { id: 'draft', kind: 'agent', agent: 'senior-copywriter' },
        {
          id: 'client-review',
          kind: 'human',
          prompt: 'Approve the draft for client delivery?',
          approvers: ['account-manager-user', 'client-stakeholder'],
          quorum: 1,
        },
        { id: 'package', kind: 'agent', agent: 'client-success' },
      ],
      edges: [
        { from: 'brief', to: 'draft', on: 'success' },
        { from: 'draft', to: 'client-review', on: 'success' },
        { from: 'client-review', to: 'package', on: 'success' },
      ],
    }),
  ],
}
