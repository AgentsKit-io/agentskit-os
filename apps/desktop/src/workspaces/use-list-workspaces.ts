import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'
import type { Workspace, WorkspaceStatus } from './types'

type SidecarWorkspace = {
  id: string
  name: string
  status: WorkspaceStatus
  description?: string
}

export const useListWorkspaces = (): (() => Promise<Workspace[]>) => {
  return useCallback(async (): Promise<Workspace[]> => {
    const result = await sidecarRequest<SidecarWorkspace[]>('workspaces.list')
    return Array.isArray(result) ? (result as Workspace[]) : []
  }, [])
}

