import { useEffect, useRef, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { getSidecarStatus, type RunMode, type SidecarStatus } from '../../lib/sidecar'
import { useDashboardStats } from './use-dashboard-stats'
import { useEventFeed } from './use-event-feed'
import { StatsGrid } from './stats-grid'
import { RecentRuns } from './recent-runs'
import { EventFeed } from './event-feed'

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

type HeaderProps = {
  workspaceName: string
  runMode: RunMode
  status: SidecarStatus
}

const RUN_MODE_LABEL: Record<RunMode, string> = {
  real: 'real',
  preview: 'preview',
  dry_run: 'dry run',
  sandbox: 'sandbox',
}

function Header({ workspaceName, runMode, status }: HeaderProps) {
  const connected = status === 'connected'
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--ag-line)] px-6 py-4">
      <h1 className="text-base font-semibold text-[var(--ag-ink)]">{workspaceName}</h1>

      <Badge variant="outline">{RUN_MODE_LABEL[runMode]}</Badge>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          connected
            ? 'border-transparent bg-[var(--ag-accent-dim)] text-[var(--ag-accent-hover)]'
            : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)]'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            connected ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-ink-subtle)]'
          }`}
        />
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

type DashboardProps = {
  /**
   * Optional ref-setter called once on mount so a parent (e.g. the command
   * palette provider) can imperatively trigger `clearEventFeed`.
   */
  onRegisterClear?: (clear: () => void) => void
}

export function Dashboard({ onRegisterClear }: DashboardProps) {
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>('disconnected')
  const { stats, isLoading } = useDashboardStats()
  const { events, isPaused, toggle, clear } = useEventFeed()

  // Expose `clear` to the parent once it stabilises.
  const registeredRef = useRef(false)
  useEffect(() => {
    if (!registeredRef.current && onRegisterClear) {
      registeredRef.current = true
      onRegisterClear(clear)
    }
  }, [clear, onRegisterClear])

  useEffect(() => {
    getSidecarStatus().then(setSidecarStatus).catch(() => {
      setSidecarStatus('error')
    })
  }, [])

  return (
    <section aria-label="Dashboard" className="flex flex-col">
      <Header
        workspaceName="My Workspace"
        runMode="preview"
        status={sidecarStatus}
      />

      <div className="flex flex-col gap-6 px-6 py-6">
        <StatsGrid stats={stats} isLoading={isLoading} />
        <RecentRuns runs={[]} />
        <EventFeed events={events} isPaused={isPaused} toggle={toggle} />
      </div>
    </section>
  )
}
