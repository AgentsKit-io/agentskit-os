/**
 * Search providers — pure functions that build `SearchEntity[]` from raw data.
 *
 * Each provider corresponds to one `SearchEntityKind`. All functions are pure
 * (no side-effects, no React) so they are easily testable.
 *
 * `gatherEntities` aggregates all providers into a single flat array.
 */

import type { SearchEntity } from './search-types'
import type { Workspace } from '../workspaces/types'
import type { Command } from '../command-palette/commands'
import type { TraceRow } from '../screens/traces/use-traces'

// ---------------------------------------------------------------------------
// Individual providers
// ---------------------------------------------------------------------------

export function workspaceEntities(workspaces: readonly Workspace[]): SearchEntity[] {
  return workspaces.map((ws) => ({
    id: `workspace:${ws.id}`,
    kind: 'workspace' as const,
    label: ws.name,
    subtitle: ws.status,
    run: () => undefined, // Switch action injected by SearchProvider with context
  }))
}

export type AgentStub = {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export function agentEntities(agents: readonly AgentStub[]): SearchEntity[] {
  return agents.map((a) => ({
    id: `agent:${a.id}`,
    kind: 'agent' as const,
    label: a.name,
    ...(a.description !== undefined ? { subtitle: a.description } : {}),
    run: () => undefined,
  }))
}

export type FlowStub = {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export function flowEntities(flows: readonly FlowStub[]): SearchEntity[] {
  return flows.map((f) => ({
    id: `flow:${f.id}`,
    kind: 'flow' as const,
    label: f.name,
    ...(f.description !== undefined ? { subtitle: f.description } : {}),
    run: () => undefined,
  }))
}

export type RunStub = {
  readonly id: string
  readonly label: string
  readonly subtitle?: string
}

export function runEntities(runs: readonly RunStub[]): SearchEntity[] {
  return runs.map((r) => ({
    id: `run:${r.id}`,
    kind: 'run' as const,
    label: r.label,
    ...(r.subtitle !== undefined ? { subtitle: r.subtitle } : {}),
    run: () => undefined,
  }))
}

export function traceEntities(traces: readonly TraceRow[]): SearchEntity[] {
  return traces.map((t) => ({
    id: `trace:${t.traceId}`,
    kind: 'trace' as const,
    label: t.traceId,
    subtitle: `${t.flowId} · ${t.runMode} · ${t.status}`,
    run: () => undefined,
  }))
}

export function commandEntities(commands: readonly Command[], onRun?: () => void): SearchEntity[] {
  return commands.map((cmd) => ({
    id: `command:${cmd.id}`,
    kind: 'command' as const,
    label: cmd.label,
    subtitle: cmd.category,
    run: () => {
      cmd.run()
      onRun?.()
    },
  }))
}

export type DocLink = {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly description?: string
}

export const BUILT_IN_DOC_LINKS: readonly DocLink[] = [
  {
    id: 'docs.quickstart',
    title: 'Quickstart Guide',
    url: 'https://docs.agentskit.io/quickstart',
    description: 'Get up and running in minutes',
  },
  {
    id: 'docs.flows',
    title: 'Building Flows',
    url: 'https://docs.agentskit.io/flows',
    description: 'Compose multi-step agent workflows',
  },
  {
    id: 'docs.agents',
    title: 'Configuring Agents',
    url: 'https://docs.agentskit.io/agents',
    description: 'Define agent behavior and models',
  },
  {
    id: 'docs.traces',
    title: 'Observability & Traces',
    url: 'https://docs.agentskit.io/traces',
    description: 'Inspect spans and debug runs',
  },
  {
    id: 'docs.settings',
    title: 'Settings Reference',
    url: 'https://docs.agentskit.io/settings',
    description: 'Configuration options and defaults',
  },
]

export function docEntities(docs: readonly DocLink[]): SearchEntity[] {
  return docs.map((d) => ({
    id: `doc:${d.id}`,
    kind: 'doc' as const,
    label: d.title,
    ...(d.description !== undefined ? { subtitle: d.description } : {}),
    run: () => {
      // Open in default browser via Tauri shell plugin if available.
      // Falls back silently (no Tauri in dev/web builds).
      void import('@tauri-apps/plugin-shell').then(({ open }) => open(d.url)).catch(() => undefined)
    },
  }))
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

export type GatherEntitiesInput = {
  readonly workspaces: readonly Workspace[]
  readonly commands: readonly Command[]
  readonly traces: readonly TraceRow[]
  readonly agents?: readonly AgentStub[]
  readonly flows?: readonly FlowStub[]
  readonly runs?: readonly RunStub[]
  readonly docs?: readonly DocLink[]
  /** Called after a command entity runs (e.g. to close the overlay). */
  readonly onCommandRun?: () => void
}

export function gatherEntities(input: GatherEntitiesInput): SearchEntity[] {
  const {
    workspaces,
    commands,
    traces,
    agents = [],
    flows = [],
    runs = [],
    docs = BUILT_IN_DOC_LINKS,
    onCommandRun,
  } = input

  return [
    ...commandEntities(commands, onCommandRun),
    ...workspaceEntities(workspaces),
    ...flowEntities(flows),
    ...agentEntities(agents),
    ...runEntities(runs),
    ...traceEntities(traces),
    ...docEntities(docs),
  ]
}
