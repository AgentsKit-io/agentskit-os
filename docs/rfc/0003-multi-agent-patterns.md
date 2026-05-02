# RFC-0003 — Multi-Agent Pattern Nodes (Compare, Vote, Debate, Auction, Blackboard)

- **Status:** Draft
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

Today flow nodes are: agent, tool, human, condition, parallel. Multi-agent topologies (G-3) are listed for M7 with no concrete primitives. Add five named patterns as first-class flow node kinds so users can do "have 3 agents try the same task and pick best" without writing custom orchestration.

## Motivation

- **User-asked feature.** "Run 3 agents, see outputs side-by-side."
- **Marketing agency.** A/B copy generation, brand-voice comparison.
- **Coding.** PR review with 3 reviewers, vote on merge.
- **Clinical.** Two-LLM consensus for low-risk suggestions; human-in-the-loop on disagreement.
- **Differentiator.** Most orchestrators expose primitives only — patterns left to user. We ship them.

## Detailed Design

Each pattern = new `FlowNode.kind` (extends discriminated union in `schema/flow.ts`).

### 1. `compare` — fan-out, side-by-side

```ts
CompareNode {
  kind: 'compare'
  id: NodeId
  agents: AgentRef[]                  // 2..8 agents
  input: NodeInput                    // shared input shape
  selection:
    | { mode: 'manual', presenter: 'side-by-side' | 'tabs' | 'overlay' }
    | { mode: 'eval', evalRef: EvalRef }
    | { mode: 'judge', judgeAgent: AgentRef, criteria: string }
    | { mode: 'first', metric: 'fastest' | 'cheapest' }
    | { mode: 'all', combine: 'concat' | 'merge' }
  isolation: 'isolated' | 'shared-scratchpad'
}
```

Use cases:
- Marketing: 3 prompts → human picks favorite → store as exemplar.
- Coding: 3 reviewers → judge agent rolls up.
- Eval: ship N variants behind feature flag; auto-eval picks winner.

UI: built-in 3-pane viewer with token/cost per output, latency, divergence highlight.

### 2. `vote` — consensus

```ts
VoteNode {
  kind: 'vote'
  id: NodeId
  agents: AgentRef[]                  // odd count enforced; default 3
  input: NodeInput
  ballot:
    | { mode: 'majority' }
    | { mode: 'weighted', weights: Record<AgentId, number> }
    | { mode: 'unanimous' }
    | { mode: 'quorum', threshold: number }   // 0..1
  outputType: 'classification' | 'numeric' | 'structured'
  onTie: 'human' | 'first' | 'judge'
  judgeAgent?: AgentRef
}
```

Use cases:
- Clinical low-risk: 2-of-3 consensus → proceed; otherwise HITL.
- Content moderation: vote on category.
- Routing: pick best handler.

### 3. `debate` — opposing positions + judge

```ts
DebateNode {
  kind: 'debate'
  id: NodeId
  proponent: AgentRef
  opponent: AgentRef
  judge: AgentRef
  topic: string | NodeInput
  rounds: number                      // 1..6, default 2
  format: 'open' | 'point-counterpoint' | 'cross-examination'
  earlyExit: 'judge-decides' | 'on-agreement'
}
```

Use cases:
- Decision support: pros/cons of treatment plan with judge synthesizer.
- Code review: "ship vs hold"; judge writes summary comment.
- Ethics: red-team vs blue-team; judge decides risk acceptance.

### 4. `auction` — agents bid for sub-task

```ts
AuctionNode {
  kind: 'auction'
  id: NodeId
  bidders: AgentRef[]
  task: NodeInput
  bidCriteria: 'lowest-cost' | 'highest-confidence' | 'fastest' | 'custom'
  customScorer?: SkillRef
  reservePrice?: { usd?: number, tokens?: number }   // skip if all exceed
  fallback?: AgentRef
  timeout?: { ms: number }
}
```

Use cases:
- Cost optimization: cheap agent handles trivial; expensive only when needed.
- Confidence routing: fast agent answers if sure; escalate otherwise.
- Marketplace: third-party agents bid for user task with revenue share.

### 5. `blackboard` — shared scratchpad

```ts
BlackboardNode {
  kind: 'blackboard'
  id: NodeId
  agents: AgentRef[]
  scratchpad:
    | { kind: 'in-memory' }
    | { kind: 'sqlite', path: string }
    | { kind: 'memory-store', ref: AgentMemoryRef }
  schedule:
    | { mode: 'round-robin' }
    | { mode: 'volunteer' }              // agents claim turns
    | { mode: 'priority', priorities: Record<AgentId, number> }
  termination:
    | { mode: 'rounds', n: number }
    | { mode: 'consensus' }
    | { mode: 'agent-signal' }           // any agent calls 'done'
    | { mode: 'budget', limits: WorkspaceLimits }
}
```

Use cases:
- Research swarm: each agent contributes findings.
- Code: planner / writer / tester / reviewer collaborating on PR.
- Brainstorming: marketing team simulator.

### 6. Common semantics

- All patterns emit per-bidder/voter/round events on bus (ADR-0005), enabling time-travel + UI streaming.
- Cost guard applies to **node-total** (sum across agents) — declare `limits` on node optionally.
- Run mode interactions:
  - `preview`: bidders run with mocked external tools.
  - `replay`: replay deterministically from event log.
  - `deterministic`: requires temperature=0 for all agents.
- HITL escape hatch on every node: `onError: 'human'` falls back to approval card.

### 7. Node UI primitives

Visual editor (P-2) ships canonical components per node kind. Side-by-side panes use shared component with token/cost overlays. Plugin extension point `flow-node-kind` (ADR-0012) lets third parties register more.

### 8. Schema location

```
packages/os-core/src/schema/flow.ts
  + CompareNode, VoteNode, DebateNode, AuctionNode, BlackboardNode
```

Discriminated union extended. SCHEMA_VERSION bump (1 → 2) with migration in `os-core/migrations`.

## Alternatives Considered

- **One generic `multi-agent` node with `pattern: ...` enum.** Rejected. Each pattern has different config shape; discriminated union cleaner.
- **Patterns as plugins only.** Rejected. They're foundational; in-tree parity (ADR-0012 §3).
- **Compose using existing `parallel` + `condition` only.** Rejected. Possible but tedious; we want template-zero ergonomics.
- **Use LangGraph / OpenAI Swarm primitives directly.** Rejected. Couples to upstream churn; we want OS contract.

## Drawbacks

- Schema size grows.
- Five patterns = five UI components to ship in M3.
- Mistakes in pattern semantics → ecosystem-wide. Spec carefully.

## Migration Path

- Schema bump v1 → v2 with auto-migrator (no breaking field changes; only additive node kinds).
- Templates pack ships canonical example per pattern.

## Security & Privacy Impact

- **Information leakage between bidders.** Auction reserve prices revealed → strategic underbidding. Mitigation: sealed-bid mode option.
- **Blackboard cross-contamination.** PII written by one agent visible to all. Workspace-level scratchpad classification (RFC-0005 consent zones interaction).
- **Cost amplification.** N agents = N× cost. Pre-flight estimator (suggested in review #2) must account.

## Open Questions

- [ ] Streaming partial outputs in `compare` UI for live race.
- [ ] Auction game theory — how to prevent collusion among bidders trained on same data.
- [ ] Blackboard concurrency control (last-writer-wins vs CRDT).
- [ ] Should `vote.weights` be learnable from past performance?
- [ ] Default `compare.selection` UX = manual or auto-judge?
