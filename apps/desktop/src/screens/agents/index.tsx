import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import type { AgentProfile, AgentProvider } from './use-agents'
import { AGENTS_FIXTURE, useAgents } from './use-agents'
import { FilterPills } from '../../components/filter-pills'
import { AgentList } from './agent-list'
import { AGENT_PROVIDER_LABEL } from './agent-labels'
import { AgentStatusPill } from './agent-status-pill'

const PROVIDER_LABEL: Record<AgentProvider, string> = AGENT_PROVIDER_LABEL

const FILTERS: Array<AgentProvider | 'all'> = ['all', 'codex', 'claude', 'cursor', 'gemini']

function AgentsSummary({ agents }: { readonly agents: readonly AgentProfile[] }) {
  const ready = agents.filter((agent) => agent.status === 'ready').length
  const busy = agents.filter((agent) => agent.status === 'busy').length
  const auth = agents.filter((agent) => agent.status === 'needs_auth').length
  const activeRuns = agents.reduce((total, agent) => total + agent.activeRuns, 0)

  const items = [
    { label: 'Ready', value: ready.toString() },
    { label: 'Busy', value: busy.toString() },
    { label: 'Auth needed', value: auth.toString() },
    { label: 'Active runs', value: activeRuns.toString() },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function AgentDetail({ agent }: { readonly agent: AgentProfile | null }) {
  if (agent === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an agent</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect provider readiness, CLI linkage, capabilities, and recent performance.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={agent.name}>
              {agent.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={agent.id}>
              {agent.id}
            </p>
          </div>
          <AgentStatusPill status={agent.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Provider" value={PROVIDER_LABEL[agent.provider]} />
        <DetailMetric label="Version" value={agent.version} />
        <DetailMetric label="Success" value={`${agent.successRatePct}%`} />
        <DetailMetric label="Avg cost" value={`$${agent.avgCostUsd.toFixed(2)}`} />
      </div>

      <div className="border-b border-[var(--ag-line)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          CLI
        </h3>
        <div className="mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 font-mono text-xs text-[var(--ag-ink-muted)]">
          {agent.cliCommand} --model {agent.model}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Capabilities
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2 py-1 text-xs text-[var(--ag-ink-muted)]"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

export function AgentsScreen() {
  const { agents, loading, error } = useAgents()
  const [filter, setFilter] = useState<AgentProvider | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(AGENTS_FIXTURE[0]?.id ?? null)

  const filteredAgents = useMemo(() => {
    return filter === 'all' ? agents : agents.filter((agent) => agent.provider === filter)
  }, [agents, filter])

  const selectedAgent = useMemo(() => {
    const match = agents.find((agent) => agent.id === selectedId)
    if (match) return match
    return filteredAgents[0] ?? null
  }, [agents, filteredAgents, selectedId])

  if (loading) {
    return (
      <section aria-label="Agents" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading agents...
      </section>
    )
  }

  return (
    <section aria-label="Agents" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Agents</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Manage CLI-backed providers available to the development orchestrator.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]">
            Sidecar agent registry unavailable. Showing local sample data.
          </div>
        )}

        <AgentsSummary agents={agents} />

        <FilterPills
          items={FILTERS}
          active={filter}
          onChange={setFilter}
          ariaLabel="Filter agents by provider"
          labelFor={(item) => (item === 'all' ? 'All' : PROVIDER_LABEL[item])}
        />

        {filteredAgents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No agents match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <AgentList agents={filteredAgents} selectedId={selectedAgent?.id ?? null} onSelect={setSelectedId} />
            <AgentDetail agent={selectedAgent} />
          </div>
        )}
      </div>
    </section>
  )
}
