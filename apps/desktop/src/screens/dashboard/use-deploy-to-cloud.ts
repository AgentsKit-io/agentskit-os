import { useCallback } from 'react'
import type { RunMode } from '../../lib/sidecar'
import { sidecarRequest } from '../../lib/sidecar'

export const useDeployToCloud = (): ((args: { mode: RunMode; label: string }) => Promise<void>) => {
  return useCallback(async (args: { mode: RunMode; label: string }): Promise<void> => {
    await sidecarRequest('cloud.deploy', args)
  }, [])
}

