/**
 * Dashboard screen — status overview with cost pill and recent runs.
 *
 * TODO(#43): wire up real run history from sidecar events once the
 * runner.runFlow surface is stable.
 * TODO(#36): replace raw div elements with os-ui Card + Badge + Button
 * primitives once @agentskit/os-ui ships.
 */

export const DashboardScreen = (): React.JSX.Element => {
  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink tracking-tight">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          {/* Status pill */}
          <StatusPill status="online" />
          {/* Cost pill — mock $0 until real cost tracking wired */}
          <CostPill costUsd={0} />
        </div>
      </div>

      {/* Recent runs */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-ink-subtle uppercase tracking-widest">
          Recent runs
        </h2>
        <RecentRunsEmpty />
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type StatusPillProps = { readonly status: 'online' | 'offline' | 'connecting' }

const StatusPill = ({ status }: StatusPillProps): React.JSX.Element => {
  const colors: Record<StatusPillProps['status'], string> = {
    online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    offline: 'bg-red-500/20 text-red-400 border-red-500/30',
    connecting: 'bg-accent/20 text-accent border-accent/30',
  }

  const labels: Record<StatusPillProps['status'], string> = {
    online: 'Sidecar online',
    offline: 'Sidecar offline',
    connecting: 'Connecting…',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === 'online' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-accent animate-pulse' : 'bg-red-400'
        }`}
      />
      {labels[status]}
    </span>
  )
}

type CostPillProps = { readonly costUsd: number }

const CostPill = ({ costUsd }: CostPillProps): React.JSX.Element => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(costUsd)

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-panel border border-line text-ink-muted">
      <span className="text-ink-subtle">Cost</span>
      {formatted}
    </span>
  )
}

const RecentRunsEmpty = (): React.JSX.Element => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-line bg-panel p-10 text-center">
    <span className="text-2xl select-none" aria-hidden>
      ░
    </span>
    <p className="text-sm text-ink-muted">No runs yet.</p>
    <p className="text-xs text-ink-subtle max-w-xs">
      Start your first flow from the workspace sidebar or via the CLI.
    </p>
  </div>
)
