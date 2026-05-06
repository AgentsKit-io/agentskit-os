import { useEffect, useRef } from 'react'
import { StatsGrid } from './stats-grid'
import { HomeHero } from './home-hero'
import { HomeActivityPanel } from './home-activity-panel'
import { NextActions } from './next-actions'
import { useDashboardRuntime } from './use-dashboard-runtime'

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

type DashboardProps = {
  readonly onNavigate?: (screen: 'runs') => void
  /**
   * Optional ref-setter called once on mount so a parent (e.g. the command
   * palette provider) can imperatively trigger `clearEventFeed`.
   */
  onRegisterClear?: (clear: () => void) => void
}

export function Dashboard({ onNavigate, onRegisterClear }: DashboardProps) {
  const runtime = useDashboardRuntime()
  const { eventsState, statsState } = runtime

  const registeredRef = useRef(false)
  useEffect(() => {
    if (!registeredRef.current && onRegisterClear) {
      registeredRef.current = true
      onRegisterClear(eventsState.clear)
    }
  }, [eventsState.clear, onRegisterClear])

  return (
    <section aria-label="Dashboard" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <HomeHero
          onChangeRunMode={runtime.setMode}
          onDeploy={runtime.deploy}
          onOpenRuns={() => onNavigate?.('runs')}
          runMode={runtime.runMode}
          status={runtime.sidecarStatus}
          workspaceName="My Workspace"
        />
        <StatsGrid stats={statsState.stats} isLoading={statsState.isLoading} />
        <NextActions />
        <HomeActivityPanel
          events={eventsState.events}
          isPaused={eventsState.isPaused}
          toggle={eventsState.toggle}
        />
      </div>
    </section>
  )
}
