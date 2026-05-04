// Per ROADMAP M3 (#61). Ten topology starter templates.

import { parseAgentConfig, parseFlowConfig } from '@agentskit/os-core'
import type { Template } from '../types.js'

const a = (id: string, name: string, system: string) =>
  parseAgentConfig({
    id,
    name,
    systemPrompt: system,
    model: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.2 },
  })

export const compareTemplate: Template = {
  id: 'compare-models',
  name: 'A/B model comparison',
  description: 'Run the same prompt against two models, compare results.',
  category: 'general',
  tags: ['compare', 'eval'],
  difficulty: 'beginner',
  version: '0.1.0',
  agents: [a('alpha', 'Alpha', 'Be concise and accurate.'), a('beta', 'Beta', 'Be concise and accurate.')],
  flows: [
    parseFlowConfig({
      id: 'compare-flow',
      name: 'Compare Models',
      entry: 'cmp',
      nodes: [{
        id: 'cmp', kind: 'compare',
        agents: ['alpha', 'beta'],
        selection: { mode: 'manual', presenter: 'side-by-side' },
      }],
      edges: [],
    }),
  ],
}

export const voteTemplate: Template = {
  id: 'vote-majority',
  name: '3-judge majority vote',
  description: 'Three judges vote independently; majority wins.',
  category: 'general',
  tags: ['vote', 'consensus'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    a('j1', 'Judge 1', 'Vote yes or no.'),
    a('j2', 'Judge 2', 'Vote yes or no.'),
    a('j3', 'Judge 3', 'Vote yes or no.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'vote-flow',
      name: 'Vote Flow',
      entry: 'v',
      nodes: [{
        id: 'v', kind: 'vote',
        agents: ['j1', 'j2', 'j3'],
        ballot: { mode: 'majority' },
        outputType: 'classification',
      }],
      edges: [],
    }),
  ],
}

export const debateTemplate: Template = {
  id: 'debate-pro-con',
  name: 'Pro/con debate',
  description: 'Pro and con agents debate with a judge.',
  category: 'general',
  tags: ['debate'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [
    a('pro', 'Pro', 'Argue in favor.'),
    a('con', 'Con', 'Argue against.'),
    a('judge', 'Judge', 'Decide the winner.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'debate-flow',
      name: 'Debate Flow',
      entry: 'd',
      nodes: [{
        id: 'd', kind: 'debate',
        proponent: 'pro', opponent: 'con', judge: 'judge',
        topic: 'Should we ship the change today?',
        rounds: 3,
      }],
      edges: [],
    }),
  ],
}

export const auctionTemplate: Template = {
  id: 'auction-bid',
  name: 'Cost-aware bid auction',
  description: 'Three bidders propose; lowest-cost plan wins.',
  category: 'general',
  tags: ['auction', 'cost'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [
    a('b1', 'Bidder 1', 'Propose with estimated cost.'),
    a('b2', 'Bidder 2', 'Propose with estimated cost.'),
    a('b3', 'Bidder 3', 'Propose with estimated cost.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'auction-flow',
      name: 'Auction Flow',
      entry: 'a',
      nodes: [{
        id: 'a', kind: 'auction',
        bidders: ['b1', 'b2', 'b3'],
        task: 'Plan the migration.',
        bidCriteria: 'lowest-cost',
      }],
      edges: [],
    }),
  ],
}

export const blackboardTemplate: Template = {
  id: 'blackboard-team',
  name: 'Shared scratchpad team',
  description: 'Three agents post to a shared blackboard until termination.',
  category: 'general',
  tags: ['blackboard', 'multi-agent'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [
    a('a1', 'Agent 1', 'Post observations.'),
    a('a2', 'Agent 2', 'Post observations.'),
    a('a3', 'Agent 3', 'Post observations.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'blackboard-flow',
      name: 'Blackboard Flow',
      entry: 'bb',
      nodes: [{
        id: 'bb', kind: 'blackboard',
        agents: ['a1', 'a2', 'a3'],
        scratchpad: { kind: 'in-memory' },
        schedule: { mode: 'round-robin' },
        termination: { mode: 'rounds', n: 3 },
      }],
      edges: [],
    }),
  ],
}

export const parallelTemplate: Template = {
  id: 'parallel-fanout',
  name: 'Parallel fan-out',
  description: 'Two branch flows execute concurrently from one entry.',
  category: 'general',
  tags: ['parallel'],
  difficulty: 'intermediate',
  version: '0.1.0',
  agents: [a('w', 'Worker', 'Process input chunk.')],
  flows: [
    parseFlowConfig({
      id: 'parallel-flow',
      name: 'Parallel Flow',
      entry: 'fanout',
      nodes: [
        { id: 'fanout', kind: 'parallel', branches: ['w1', 'w2'] },
        { id: 'w1', kind: 'agent', agent: 'w' },
        { id: 'w2', kind: 'agent', agent: 'w' },
      ],
      edges: [
        { from: 'fanout', to: 'w1' },
        { from: 'fanout', to: 'w2' },
      ],
    }),
  ],
}

export const conditionTemplate: Template = {
  id: 'condition-triage',
  name: 'Conditional triage routing',
  description: 'Inbound ticket routed to support or escalation based on condition.',
  category: 'support',
  tags: ['condition', 'routing'],
  difficulty: 'beginner',
  version: '0.1.0',
  agents: [
    a('triage', 'Triager', 'Classify the ticket.'),
    a('support', 'Support', 'Resolve the ticket.'),
    a('escalate', 'Escalation', 'Escalate to a human.'),
  ],
  flows: [
    parseFlowConfig({
      id: 'condition-flow',
      name: 'Condition Flow',
      entry: 'triage',
      nodes: [
        { id: 'triage', kind: 'agent', agent: 'triage' },
        { id: 'route', kind: 'condition', expression: 'severity === "high"' },
        { id: 'support', kind: 'agent', agent: 'support' },
        { id: 'escalate', kind: 'agent', agent: 'escalate' },
      ],
      edges: [
        { from: 'triage', to: 'route' },
        { from: 'route', to: 'support' },
        { from: 'route', to: 'escalate' },
      ],
    }),
  ],
}

export const linearPipelineTemplate: Template = {
  id: 'linear-doc-summarize',
  name: 'Linear document summarizer',
  description: 'Read → summarize → write. Simplest possible pipeline.',
  category: 'general',
  tags: ['linear', 'summarize'],
  difficulty: 'beginner',
  version: '0.1.0',
  agents: [a('summarize', 'Summarizer', 'Summarize in 5 bullets.')],
  flows: [
    parseFlowConfig({
      id: 'linear-flow',
      name: 'Linear Flow',
      entry: 'read',
      nodes: [
        { id: 'read', kind: 'tool', tool: 'fs.read' },
        { id: 'summarize', kind: 'agent', agent: 'summarize' },
        { id: 'write', kind: 'tool', tool: 'fs.write' },
      ],
      edges: [
        { from: 'read', to: 'summarize' },
        { from: 'summarize', to: 'write' },
      ],
    }),
  ],
}

export const composeTemplate: Template = {
  id: 'compose-nested',
  name: 'Nested flow composition',
  description: 'Pre/post tools wrap an agent step.',
  category: 'general',
  tags: ['compose'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [a('inner', 'Inner Agent', 'Process input.')],
  flows: [
    parseFlowConfig({
      id: 'compose-outer',
      name: 'Outer Flow',
      entry: 'pre',
      nodes: [
        { id: 'pre', kind: 'tool', tool: 'noop' },
        { id: 'inner', kind: 'agent', agent: 'inner' },
        { id: 'post', kind: 'tool', tool: 'noop' },
      ],
      edges: [
        { from: 'pre', to: 'inner' },
        { from: 'inner', to: 'post' },
      ],
    }),
  ],
}

export const replayTraceTemplate: Template = {
  id: 'replay-from-trace',
  name: 'Replay from observed trace',
  description: 'Re-runs a previous trace deterministically (replay mode).',
  category: 'general',
  tags: ['replay', 'debug'],
  difficulty: 'advanced',
  version: '0.1.0',
  agents: [a('replayer', 'Replayer', 'Re-execute observed steps.')],
  flows: [
    parseFlowConfig({
      id: 'replay-flow',
      name: 'Replay Flow',
      entry: 'load',
      nodes: [
        { id: 'load', kind: 'tool', tool: 'trace.load' },
        { id: 'replayer', kind: 'agent', agent: 'replayer' },
      ],
      edges: [{ from: 'load', to: 'replayer' }],
    }),
  ],
}

export const TOPOLOGY_TEMPLATES: readonly Template[] = [
  compareTemplate,
  voteTemplate,
  debateTemplate,
  auctionTemplate,
  blackboardTemplate,
  parallelTemplate,
  conditionTemplate,
  linearPipelineTemplate,
  composeTemplate,
  replayTraceTemplate,
]
