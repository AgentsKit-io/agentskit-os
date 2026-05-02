// ADR-0015 — pure mapping from AgentsKit's tool contract to os-runtime's
// ToolExecutor. Schema validation lives upstream (ADR-0004); this only
// dispatches the call and normalizes the return shape.

import type { ToolCall, ToolExecutor, ToolResult } from '@agentskit/os-runtime'
import type { RunContext } from '@agentskit/os-core'

export type AgentskitToolReturn =
  | { readonly kind: 'ok'; readonly value: unknown }
  | { readonly kind: 'error'; readonly code: string; readonly message: string }
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly code: string; readonly message: string }
  | unknown

export interface AgentskitTool {
  readonly name: string
  readonly description?: string
  execute(args: Record<string, unknown>, ctx: RunContext): Promise<AgentskitToolReturn>
}

export type AgentskitToolExecutorOptions = {
  readonly idResolver?: (tool: AgentskitTool) => string
  readonly errorCode?: string
}

const DEFAULT_ERROR_CODE = 'AGENTSKIT_TOOL_ERROR'

const asString = (v: unknown): string => (typeof v === 'string' ? v : String(v))

const normalize = (raw: AgentskitToolReturn): ToolResult => {
  if (raw === null || typeof raw !== 'object') return { kind: 'ok', value: raw }
  const r = raw as Record<string, unknown>
  if (r.kind === 'ok') return { kind: 'ok', value: r.value }
  if (r.kind === 'error') return { kind: 'error', code: asString(r.code), message: asString(r.message) }
  if (r.ok === true) return { kind: 'ok', value: r.value }
  if (r.ok === false) return { kind: 'error', code: asString(r.code), message: asString(r.message) }
  return { kind: 'ok', value: raw }
}

export const createAgentskitToolExecutor = (
  tools: readonly AgentskitTool[],
  opts: AgentskitToolExecutorOptions = {},
): ToolExecutor => {
  const resolveId = opts.idResolver ?? ((t) => t.name)
  const errorCode = opts.errorCode ?? DEFAULT_ERROR_CODE
  const byId = new Map<string, AgentskitTool>()
  for (const t of tools) {
    const id = resolveId(t)
    if (byId.has(id)) {
      throw new Error(`createAgentskitToolExecutor: duplicate tool id "${id}"`)
    }
    byId.set(id, t)
  }
  return {
    knows: (toolId: string) => byId.has(toolId),
    invoke: async (call: ToolCall, ctx: RunContext): Promise<ToolResult> => {
      const tool = byId.get(call.toolId)
      if (!tool) {
        return { kind: 'error', code: 'TOOL_NOT_FOUND', message: `unknown tool: ${call.toolId}` }
      }
      try {
        const raw = await tool.execute(call.args, ctx)
        return normalize(raw)
      } catch (err) {
        return {
          kind: 'error',
          code: errorCode,
          message: err instanceof Error ? err.message : String(err),
        }
      }
    },
  }
}
