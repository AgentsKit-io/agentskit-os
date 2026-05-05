import type { NodeHandler } from '@agentskit/os-flow'
import type { ToolExecutor } from '../adapters.js'

export const createToolHandler = (executor: ToolExecutor): NodeHandler<'tool'> => {
  return async (node, input, ctx) => {
    if (!executor.knows(node.tool)) {
      return {
        kind: 'failed',
        error: { code: 'tool.not_registered', message: `tool "${node.tool}" not registered` },
      }
    }
    let baseArgs: unknown = {}
    if (node.input !== undefined) baseArgs = node.input
    else if (typeof input === 'object' && input !== null) baseArgs = input
    const args = baseArgs as Record<string, unknown>
    try {
      const r = await executor.invoke({ toolId: node.tool, args }, ctx)
      if (r.kind === 'ok') return { kind: 'ok', value: r.value }
      return { kind: 'failed', error: { code: r.code, message: r.message } }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        kind: 'failed',
        error: { code: 'tool.threw', message },
      }
    }
  }
}
