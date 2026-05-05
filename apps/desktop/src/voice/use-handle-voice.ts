import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'

export const useHandleVoice = (): ((text: string) => Promise<void>) => {
  return useCallback(async (text: string): Promise<void> => {
    await sidecarRequest('voice.handle', { text })
  }, [])
}

