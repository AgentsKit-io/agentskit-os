import { useEffect, useMemo, useRef, useState } from 'react'
import { getRunMode, setRunMode } from '../../lib/run-mode-store'
import { getSidecarStatus, sidecarRequest, type RunMode, type SidecarStatus } from '../../lib/sidecar'
import { useDashboardStats } from './use-dashboard-stats'
import { useEventFeed } from './use-event-feed'

type DashboardRuntime = {
  readonly deploy: () => void
  readonly eventsState: ReturnType<typeof useEventFeed>
  readonly runMode: RunMode
  readonly setMode: (mode: RunMode) => void
  readonly sidecarStatus: SidecarStatus
  readonly statsState: ReturnType<typeof useDashboardStats>
}

export function useDashboardRuntime(): DashboardRuntime {
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>('disconnected')
  const [runMode, setRunModeState] = useState<RunMode>(() => getRunMode())
  const statsState = useDashboardStats()
  const eventsState = useEventFeed()
  const runModeRef = useRef(runMode)
  runModeRef.current = runMode

  useEffect(() => {
    getSidecarStatus().then(setSidecarStatus).catch(() => {
      setSidecarStatus('error')
    })
  }, [])

  const deploy = useMemo(
    () => () => {
      const mode = runModeRef.current
      void sidecarRequest('cloud.deploy', { mode, label: mode === 'real' ? 'prod' : 'dev' })
    },
    [],
  )

  function setMode(mode: RunMode): void {
    setRunMode(mode)
    setRunModeState(mode)
  }

  return { deploy, eventsState, runMode, setMode, sidecarStatus, statsState }
}

