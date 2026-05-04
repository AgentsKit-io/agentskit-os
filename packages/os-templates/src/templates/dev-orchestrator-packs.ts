// Per ROADMAP M3 (#61). Five dev-orchestrator templates that compose
// the coding-agent contract (#352) with HITL + flow primitives.

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

const orchestrator = (id: string, name: string, system: string) =>
  parseAgentConfig({
    id,
    name,
    systemPrompt: system,
    model: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.2 },
  })

export const devPrReviewTemplate: Template = {
  id: 'dev-pr-review',
  name: 'Dev: PR review (coding-agent)',
  description:
    'Run a coding-agent provider over a PR diff, then post review comments via GitHub tool.',
  category: 'coding',
  tags: ['dev-orchestrator', 'pr', 'review'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [orchestrator('pr-reviewer', 'PR Reviewer', 'Coordinate diff review.')],
  flows: [
    parseFlowConfig({
      id: 'dev-pr-review-flow',
      name: 'Dev PR Review',
      entry: 'fetch',
      nodes: [
        { id: 'fetch', kind: 'tool', tool: 'github.pr.diff' },
        { id: 'review', kind: 'tool', tool: 'coding-agent.review' },
        { id: 'comment', kind: 'tool', tool: 'github.pr.comment' },
      ],
      edges: [
        { from: 'fetch', to: 'review' },
        { from: 'review', to: 'comment' },
      ],
    }),
  ],
}

export const devBugFixTemplate: Template = {
  id: 'dev-bug-fix',
  name: 'Dev: bug fix loop',
  description:
    'Read failing test, ask coding-agent to fix, re-run tests, escalate to HITL on second failure.',
  category: 'coding',
  tags: ['dev-orchestrator', 'bug-fix', 'tdd'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [orchestrator('bug-fixer', 'Bug Fixer', 'Coordinate bug-fix loop.')],
  flows: [
    parseFlowConfig({
      id: 'dev-bug-fix-flow',
      name: 'Dev Bug Fix Flow',
      entry: 'read-failing',
      nodes: [
        { id: 'read-failing', kind: 'tool', tool: 'test.runner.read-failing' },
        { id: 'fix', kind: 'tool', tool: 'coding-agent.fix' },
        { id: 'rerun', kind: 'tool', tool: 'test.runner.run' },
        { id: 'human-review', kind: 'human', prompt: 'Tests still failing — approve next steps?', approvers: ['reviewer'], quorum: 1 },
      ],
      edges: [
        { from: 'read-failing', to: 'fix' },
        { from: 'fix', to: 'rerun' },
        { from: 'rerun', to: 'human-review' },
      ],
    }),
  ],
}

export const devCodeReviewTemplate: Template = {
  id: 'dev-code-review',
  name: 'Dev: 3-way code review',
  description:
    'Three coding-agent providers review the same diff; results compared side-by-side.',
  category: 'coding',
  tags: ['dev-orchestrator', 'compare', 'multi-provider'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [
    orchestrator('rev-a', 'Reviewer A', 'Review for correctness.'),
    orchestrator('rev-b', 'Reviewer B', 'Review for style.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'dev-code-review-flow',
      name: 'Dev Code Review',
      entry: 'cmp',
      nodes: [
        {
          id: 'cmp',
          kind: 'compare',
          agents: ['rev-a', 'rev-b'],
          selection: { mode: 'manual', presenter: 'side-by-side' },
        },
      ],
      edges: [],
    }),
  ],
}

export const devRefactorTemplate: Template = {
  id: 'dev-refactor',
  name: 'Dev: assisted refactor',
  description:
    'Coding-agent proposes a refactor, dry-run preview, HITL approve, then apply.',
  category: 'coding',
  tags: ['dev-orchestrator', 'refactor'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [orchestrator('refactorer', 'Refactorer', 'Plan and apply refactor.')],
  flows: [
    parseFlowConfig({
      id: 'dev-refactor-flow',
      name: 'Dev Refactor Flow',
      entry: 'plan',
      nodes: [
        { id: 'plan', kind: 'tool', tool: 'coding-agent.plan' },
        { id: 'preview', kind: 'tool', tool: 'coding-agent.dry-run' },
        { id: 'approve', kind: 'human', prompt: 'Approve applying this refactor?', approvers: ['maintainer'], quorum: 1 },
        { id: 'apply', kind: 'tool', tool: 'coding-agent.apply' },
      ],
      edges: [
        { from: 'plan', to: 'preview' },
        { from: 'preview', to: 'approve' },
        { from: 'approve', to: 'apply' },
      ],
    }),
  ],
}

export const devEvalTemplate: Template = {
  id: 'dev-eval',
  name: 'Dev: eval suite runner',
  description:
    'Run a domain pack against a coding-agent provider and report pass/fail per criterion.',
  category: 'coding',
  tags: ['dev-orchestrator', 'eval'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [orchestrator('eval-runner', 'Eval Runner', 'Execute eval suite.')],
  flows: [
    parseFlowConfig({
      id: 'dev-eval-flow',
      name: 'Dev Eval Flow',
      entry: 'load',
      nodes: [
        { id: 'load', kind: 'tool', tool: 'eval.load-pack' },
        { id: 'run', kind: 'tool', tool: 'coding-agent.run-evals' },
        { id: 'report', kind: 'tool', tool: 'eval.report' },
      ],
      edges: [
        { from: 'load', to: 'run' },
        { from: 'run', to: 'report' },
      ],
    }),
  ],
}

export const DEV_ORCHESTRATOR_TEMPLATES: readonly Template[] = [
  devPrReviewTemplate,
  devBugFixTemplate,
  devCodeReviewTemplate,
  devRefactorTemplate,
  devEvalTemplate,
]
