import { useCallback } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

type ReplayResponse = {
  readonly runId: string
}

export const useReplayTrace = (): ((traceId: string) => Promise<string>) => {
  return useCallback(async (traceId: string): Promise<string> => {
    const res = await sidecarRequest<ReplayResponse>('traces.replay', { traceId })
    return res.runId
  }, [])
}

