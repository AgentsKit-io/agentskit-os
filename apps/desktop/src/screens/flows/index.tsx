import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { FlowBuilderPanel } from './flow-builder-panel'
import { FlowDetailPanel } from './flow-detail-panel'
import { FLOW_FILTERS, FlowRegistryPanel, FlowSummary } from './flow-registry-panel'
import { useFlowRunner } from './use-flow-runner'
import { FLOWS_FIXTURE, useFlows } from './use-flows'

type FlowFilter = (typeof FLOW_FILTERS)[number]

const BUILD_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function FlowsScreen() {
  const { flows, loading, error } = useFlows()
  const { running, runFlow } = useFlowRunner()
  const [filter, setFilter] = useState<FlowFilter>('all')
  const initialSelectedId = (() => {
    const first = FLOWS_FIXTURE[0]
    if (first && typeof first.id === 'string') return first.id
    return null
  })()
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)

  const filteredFlows = useMemo(
    () => (filter === 'all' ? flows : flows.filter((flow) => flow.status === filter)),
    [flows, filter],
  )

  const selectedFlow = useMemo(() => {
    const match = flows.find((flow) => flow.id === selectedId)
    if (match) return match
    const first = filteredFlows[0]
    if (first) return first
    return null
  }, [flows, filteredFlows, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Build"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading flows...
      </section>
    )
  }

  return (
    <section aria-label="Build" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={BUILD_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Build mode
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Flows, agents, skills, and templates
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Local registry</Badge>
          <button
            type="button"
            disabled={running || selectedFlow === null}
            className="rounded-full bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ag-accent-hover)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (!selectedFlow) return
              void runFlow(selectedFlow.id)
            }}
          >
            {running ? 'Running...' : 'Run selected'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar flow provider unavailable. Showing local sample data.
          </div>
        )}

        <FlowBuilderPanel />
        <FlowSummary flows={flows} />

        {filteredFlows.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No flows match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <FlowRegistryPanel
              flows={filteredFlows}
              filter={filter}
              selectedId={selectedFlow?.id ?? null}
              onFilter={setFilter}
              onSelect={setSelectedId}
            />
            <FlowDetailPanel flow={selectedFlow} />
          </div>
        )}
      </div>
    </section>
  )
}
