import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

export const prReviewTemplate: Template = {
  id: 'pr-review',
  name: 'GitHub PR Review',
  description:
    'Fetch a pull request, run a reviewer agent, post a summary comment back. Linear DAG with one agent + two tools.',
  category: 'coding',
  tags: ['github', 'code-review', 'webhook'],
  difficulty: 'beginner',
  version: '0.1.0',
  agents: [
    parseAgentConfig({
      id: 'pr-reviewer',
      name: 'PR Reviewer',
      systemPrompt:
        'You review pull requests for clarity, correctness, and convention adherence. Output a concise summary with bullet points for issues and a one-line verdict.',
      model: { provider: 'anthropic', model: 'claude-opus-4-7', temperature: 0.2 },
    }),
  ],
  flows: [
    parseFlowConfig({
      id: 'pr-review-flow',
      name: 'PR Review Flow',
      entry: 'fetch',
      nodes: [
        { id: 'fetch', kind: 'tool', tool: 'github.pr.read' },
        { id: 'review', kind: 'agent', agent: 'pr-reviewer' },
        { id: 'comment', kind: 'tool', tool: 'github.pr.comment' },
      ],
      edges: [
        { from: 'fetch', to: 'review' },
        { from: 'review', to: 'comment' },
      ],
    }),
  ],
}
