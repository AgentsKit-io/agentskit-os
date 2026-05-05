import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { AgentDetailPanel } from './agent-detail-panel'
import { AgentList } from './agent-list'
import { AgentProviderFilters, AGENT_FILTERS, type AgentFilter } from './agent-provider-filters'
import { AgentSummary } from './agent-summary'
import { AGENTS_FIXTURE, useAgents } from './use-agents'

const AGENTS_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function AgentsScreen() {
  const { agents, loading, error } = useAgents()
  const [filter, setFilter] = useState<AgentFilter>(AGENT_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(AGENTS_FIXTURE[0]?.id ?? null)

  const filteredAgents = useMemo(
    () => (filter === 'all' ? agents : agents.filter((agent) => agent.provider === filter)),
    [agents, filter],
  )

  const selectedAgent = useMemo(() => {
    const match = agents.find((agent) => agent.id === selectedId)
    if (match) return match
    return filteredAgents[0] ?? null
  }, [agents, filteredAgents, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Agents"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading agents...
      </section>
    )
  }

  return (
    <section aria-label="Agents" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={AGENTS_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Provider registry
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Agents
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Manage CLI-backed providers available to the development orchestrator.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar agent registry unavailable. Showing local sample data.
          </div>
        )}

        <AgentSummary agents={agents} />
        <AgentProviderFilters filter={filter} onFilter={setFilter} />

        {filteredAgents.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No agents match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <AgentList
              agents={filteredAgents}
              selectedId={selectedAgent?.id ?? null}
              onSelect={setSelectedId}
            />
            <AgentDetailPanel agent={selectedAgent} />
          </div>
        )}
      </div>
    </section>
  )
}
