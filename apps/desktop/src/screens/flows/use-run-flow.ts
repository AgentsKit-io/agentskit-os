import { useCallback, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export const useRunFlow = (): {
  runFlow: (args: { flowId: string; mode: string }) => Promise<void>
  running: boolean
} => {
  const [running, setRunning] = useState(false)

  const runFlow = useCallback(async (args: { flowId: string; mode: string }): Promise<void> => {
    setRunning(true)
    try {
      await sidecarRequest('runner.runFlow', args)
    } finally {
      setRunning(false)
    }
  }, [])

  return { runFlow, running }
}

