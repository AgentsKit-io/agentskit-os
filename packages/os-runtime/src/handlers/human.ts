import type { NodeHandler } from '@agentskit/os-flow'
import type { HumanReviewer } from '../adapters.js'

export const createHumanHandler = (reviewer: HumanReviewer): NodeHandler<'human'> => {
  return async (node, _input, ctx) => {
    try {
      const result = await reviewer.request(node.prompt, node.approvers, ctx)
      if (result.decision === 'pending') {
        return { kind: 'paused', reason: 'hitl' }
      }
      if (result.decision === 'approved') {
        return { kind: 'ok', value: { approved: true, note: result.note ?? null } }
      }
      return {
        kind: 'failed',
        error: { code: 'hitl.rejected', message: result.note ?? 'rejected by reviewer' },
      }
    } catch (err) {
      return {
        kind: 'failed',
        error: { code: 'hitl.threw', message: (err as Error).message ?? String(err) },
      }
    }
  }
}
