import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import type { AgentProfile, AgentProvider, AgentStatus } from './use-agents'
import { AGENTS_FIXTURE, useAgents } from './use-agents'
import { FilterPills } from '../../components/filter-pills'

const STATUS_LABEL: Record<AgentStatus, string> = {
  ready: 'Ready',
  busy: 'Busy',
  offline: 'Offline',
  needs_auth: 'Needs auth',
}

const STATUS_CLASSES: Record<AgentStatus, string> = {
  ready: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  busy: 'border-[var(--ag-accent)]/25 bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
  offline: 'border-[var(--ag-ink-muted)]/25 bg-[var(--ag-ink-muted)]/10 text-[var(--ag-ink-muted)]',
  needs_auth: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
}

const PROVIDER_LABEL: Record<AgentProvider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  cursor: 'Cursor',
  gemini: 'Gemini',
}

const FILTERS: Array<AgentProvider | 'all'> = ['all', 'codex', 'claude', 'cursor', 'gemini']

function StatusPill({ status }: { readonly status: AgentStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

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

function AgentList({
  agents,
  selectedId,
  onSelect,
}: {
  readonly agents: readonly AgentProfile[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Agent registry">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-3 py-2 font-medium">Provider</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">Active</th>
            <th className="px-4 py-2 font-medium">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {agents.map((agent) => (
            <tr
              key={agent.id}
              tabIndex={0}
              aria-selected={selectedId === agent.id}
              onClick={() => onSelect(agent.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(agent.id)
                }
              }}
              className={[
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === agent.id
                  ? 'bg-[var(--ag-accent)]/10'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[280px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={agent.name}>
                  {agent.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {agent.cliCommand}
                </div>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {PROVIDER_LABEL[agent.provider]}
              </td>
              <td className="px-3 py-3">
                <StatusPill status={agent.status} />
              </td>
              <td className="max-w-[180px] truncate px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]" title={agent.model}>
                {agent.model}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{agent.activeRuns}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatTime(agent.lastRunAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
          <StatusPill status={agent.status} />
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
          <div role="status" className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
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
