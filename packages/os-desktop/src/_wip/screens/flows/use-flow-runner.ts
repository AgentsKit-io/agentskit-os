import { useState } from 'react'
import { getRunMode } from '../../lib/run-mode-store'
import { sidecarRequest } from '../../lib/sidecar'

type FlowRunnerState = {
  readonly running: boolean
  readonly runFlow: (flowId: string) => Promise<void>
}

export function useFlowRunner(): FlowRunnerState {
  const [running, setRunning] = useState(false)

  async function runFlow(flowId: string): Promise<void> {
    setRunning(true)
    try {
      await sidecarRequest('runner.runFlow', { flowId, mode: getRunMode() })
    } finally {
      setRunning(false)
    }
  }

  return { running, runFlow }
}

