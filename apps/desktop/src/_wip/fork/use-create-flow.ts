import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'
import type { ForkDraft, FlowCreateResponse } from './fork-types'

const buildFlowCreateRequest = (draft: ForkDraft): { draft: ForkDraft } => {
  return {
    draft: {
      ...draft,
      name: draft.name.trim(),
    },
  }
}

export const resolveCreatedFlowId = (res: FlowCreateResponse): string => {
  if (res.flowId && res.flowId.length > 0) return res.flowId
  return `flow-${Date.now()}`
}

export const useCreateFlow = (): ((draft: ForkDraft) => Promise<FlowCreateResponse>) => {
  return useCallback(async (draft: ForkDraft): Promise<FlowCreateResponse> => {
    return await sidecarRequest<FlowCreateResponse>('flows.create', buildFlowCreateRequest(draft))
  }, [])
}

