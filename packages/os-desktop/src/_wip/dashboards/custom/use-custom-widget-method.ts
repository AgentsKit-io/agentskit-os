import { useCallback } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export const useCustomWidgetMethod = (): ((method: string) => Promise<unknown>) => {
  return useCallback(async (method: string): Promise<unknown> => {
    return await sidecarRequest(method)
  }, [])
}

