import type { NodeHandler } from '@agentskit/os-flow'

// Parallel node delegates to flow runner — at runtime, the engine fans out to
// listed branches. This handler is a no-op marker; runner emits the branch
// nodes via edges. Returning ok lets downstream edges fire.
export const createParallelHandler = (): NodeHandler<'parallel'> => {
  return async () => ({ kind: 'ok', value: { fanned: true } })
}
