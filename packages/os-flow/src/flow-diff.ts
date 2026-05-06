import type { FlowConfig, FlowEdge, FlowNode } from '@agentskit/os-core'

export type FlowNodeChange =
  | { kind: 'added'; node: FlowNode }
  | { kind: 'removed'; node: FlowNode }
  | {
      kind: 'modified'
      nodeId: string
      before: FlowNode
      after: FlowNode
      changes: readonly string[]
    }

export type FlowEdgeKey = `${string}::${string}::${FlowEdge['on']}`

export type FlowEdgeChange =
  | { kind: 'added'; edge: FlowEdge }
  | { kind: 'removed'; edge: FlowEdge }

export type FlowSemanticDiff = {
  readonly flowId: string
  readonly fromName?: string
  readonly toName?: string
  readonly nodeChanges: readonly FlowNodeChange[]
  readonly edgeChanges: readonly FlowEdgeChange[]
  readonly entryChanged: boolean
  readonly tagChanges: readonly { kind: 'added' | 'removed'; tag: string }[]
}

const nodeKeyFields = (n: FlowNode): Record<string, unknown> => {
  switch (n.kind) {
    case 'agent':
      return { kind: n.kind, agent: n.agent, input: n.input, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'tool':
      return { kind: n.kind, tool: n.tool, input: n.input, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'human':
      return { kind: n.kind, prompt: n.prompt, approvers: n.approvers, quorum: n.quorum, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'condition':
      return { kind: n.kind, expression: n.expression, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'parallel':
      return { kind: n.kind, branches: n.branches, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'compare':
      return { kind: n.kind, agents: n.agents, input: n.input, selection: n.selection, isolation: n.isolation, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'vote':
      return { kind: n.kind, agents: n.agents, input: n.input, ballot: n.ballot, outputType: n.outputType, onTie: n.onTie, judgeAgent: n.judgeAgent, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'debate':
      return { kind: n.kind, proponent: n.proponent, opponent: n.opponent, judge: n.judge, topic: n.topic, rounds: n.rounds, format: n.format, earlyExit: n.earlyExit, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'auction':
      return { kind: n.kind, bidders: n.bidders, task: n.task, bidCriteria: n.bidCriteria, customScorer: n.customScorer, reservePrice: n.reservePrice, fallback: n.fallback, timeout: n.timeout, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'blackboard':
      return { kind: n.kind, agents: n.agents, scratchpad: n.scratchpad, schedule: n.schedule, termination: n.termination, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
    case 'llm-branch':
      return { kind: n.kind, agent: n.agent, prompt: n.prompt, branches: n.branches, fallbackOutcome: n.fallbackOutcome, retry: n.retry, timeoutMs: n.timeoutMs, label: n.label }
  }
}

const stableJson = (v: unknown): string => {
  if (v === null || v === undefined) return JSON.stringify(v)
  if (typeof v !== 'object') return JSON.stringify(v)
  return JSON.stringify(v, Object.keys(v as object).sort())
}

const diffFields = (before: Record<string, unknown>, after: Record<string, unknown>): readonly string[] => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes: string[] = []
  for (const k of [...keys].sort()) {
    const a = (before as Record<string, unknown>)[k]
    const b = (after as Record<string, unknown>)[k]
    if (stableJson(a) !== stableJson(b)) changes.push(k)
  }
  return changes
}

const edgeKey = (e: FlowEdge): FlowEdgeKey => `${e.from}::${e.to}::${e.on}` as const

/**
 * Compute a semantic diff between two flows:
 * - nodes: added/removed/modified (by id)
 * - edges: added/removed (by from/to/on)
 * - entry + tags changes
 */
export const diffFlowSemantics = (
  from: FlowConfig,
  to: FlowConfig,
): FlowSemanticDiff => {
  const fromNodes = new Map(from.nodes.map((n) => [n.id, n]))
  const toNodes = new Map(to.nodes.map((n) => [n.id, n]))

  const nodeChanges: FlowNodeChange[] = []
  const allNodeIds = new Set([...fromNodes.keys(), ...toNodes.keys()])
  for (const id of [...allNodeIds].sort()) {
    const a = fromNodes.get(id)
    const b = toNodes.get(id)
    if (!a && b) nodeChanges.push({ kind: 'added', node: b })
    else if (a && !b) nodeChanges.push({ kind: 'removed', node: a })
    else if (a && b) {
      const af = nodeKeyFields(a)
      const bf = nodeKeyFields(b)
      const changes = diffFields(af, bf)
      if (changes.length > 0) nodeChanges.push({ kind: 'modified', nodeId: id, before: a, after: b, changes })
    }
  }

  const fromEdges = new Map(from.edges.map((e) => [edgeKey(e), e]))
  const toEdges = new Map(to.edges.map((e) => [edgeKey(e), e]))
  const edgeChanges: FlowEdgeChange[] = []
  const allEdgeKeys = new Set([...fromEdges.keys(), ...toEdges.keys()])
  for (const k of [...allEdgeKeys].sort()) {
    const a = fromEdges.get(k)
    const b = toEdges.get(k)
    if (!a && b) edgeChanges.push({ kind: 'added', edge: b })
    else if (a && !b) edgeChanges.push({ kind: 'removed', edge: a })
  }

  const fromTags = new Set(from.tags ?? [])
  const toTags = new Set(to.tags ?? [])
  const tagChanges: { kind: 'added' | 'removed'; tag: string }[] = []
  for (const t of [...fromTags].sort()) if (!toTags.has(t)) tagChanges.push({ kind: 'removed', tag: t })
  for (const t of [...toTags].sort()) if (!fromTags.has(t)) tagChanges.push({ kind: 'added', tag: t })

  return {
    flowId: to.id,
    fromName: from.name,
    toName: to.name,
    nodeChanges,
    edgeChanges,
    entryChanged: from.entry !== to.entry,
    tagChanges,
  }
}

export const renderFlowDiffMarkdown = (d: FlowSemanticDiff): string => {
  const lines: string[] = []
  lines.push(`## Flow diff: \`${d.flowId}\``)
  if (d.fromName && d.toName && d.fromName !== d.toName) {
    lines.push(`- Name: **${d.fromName}** → **${d.toName}**`)
  }
  if (d.entryChanged) lines.push(`- Entry changed`)
  if (d.tagChanges.length > 0) {
    const adds = d.tagChanges.filter((t) => t.kind === 'added').map((t) => `\`${t.tag}\``)
    const rms = d.tagChanges.filter((t) => t.kind === 'removed').map((t) => `\`${t.tag}\``)
    if (adds.length) lines.push(`- Tags added: ${adds.join(', ')}`)
    if (rms.length) lines.push(`- Tags removed: ${rms.join(', ')}`)
  }

  const addedNodes = d.nodeChanges.filter((c) => c.kind === 'added') as Array<{ kind: 'added'; node: FlowNode }>
  const removedNodes = d.nodeChanges.filter((c) => c.kind === 'removed') as Array<{ kind: 'removed'; node: FlowNode }>
  const modifiedNodes = d.nodeChanges.filter((c) => c.kind === 'modified') as Array<Extract<FlowNodeChange, { kind: 'modified' }>>

  lines.push('')
  lines.push(`### Nodes`)
  lines.push(`- Added: ${addedNodes.length}`)
  lines.push(`- Removed: ${removedNodes.length}`)
  lines.push(`- Modified: ${modifiedNodes.length}`)

  if (addedNodes.length) {
    lines.push('')
    lines.push(`#### Added nodes`)
    for (const c of addedNodes) lines.push(`- \`${c.node.id}\` (${c.node.kind})`)
  }
  if (removedNodes.length) {
    lines.push('')
    lines.push(`#### Removed nodes`)
    for (const c of removedNodes) lines.push(`- \`${c.node.id}\` (${c.node.kind})`)
  }
  if (modifiedNodes.length) {
    lines.push('')
    lines.push(`#### Modified nodes`)
    for (const c of modifiedNodes) {
      lines.push(`- \`${c.nodeId}\`: ${c.changes.map((x) => `\`${x}\``).join(', ')}`)
    }
  }

  const addedEdges = d.edgeChanges.filter((c) => c.kind === 'added') as Array<{ kind: 'added'; edge: FlowEdge }>
  const removedEdges = d.edgeChanges.filter((c) => c.kind === 'removed') as Array<{ kind: 'removed'; edge: FlowEdge }>

  lines.push('')
  lines.push(`### Edges`)
  lines.push(`- Added: ${addedEdges.length}`)
  lines.push(`- Removed: ${removedEdges.length}`)
  if (addedEdges.length) {
    lines.push('')
    lines.push(`#### Added edges`)
    for (const c of addedEdges) lines.push(`- \`${c.edge.from}\` → \`${c.edge.to}\` (\`${c.edge.on}\`)`)
  }
  if (removedEdges.length) {
    lines.push('')
    lines.push(`#### Removed edges`)
    for (const c of removedEdges) lines.push(`- \`${c.edge.from}\` → \`${c.edge.to}\` (\`${c.edge.on}\`)`)
  }

  return lines.join('\n') + '\n'
}

