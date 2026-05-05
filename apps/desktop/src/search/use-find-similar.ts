import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'

export const useFindSimilar = (): ((entityId: string) => Promise<void>) => {
  return useCallback(async (entityId: string): Promise<void> => {
    await sidecarRequest('search.findSimilar', { entityId })
  }, [])
}

