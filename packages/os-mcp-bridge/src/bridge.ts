// Per #84 — MCP Bridge v2: publish AK tools as MCP, consume MCP tools.
// Pure: schema + transformers between AK ToolRef shapes and MCP tool shapes.
// Transport (stdio/sse/http) lives at the runtime boundary.

export type McpToolDescriptor = {
  readonly name: string
  readonly description: string
  /** JSON Schema for the tool input. */
  readonly inputSchema: Record<string, unknown>
}

export type McpToolCall = {
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export type AkToolDescriptor = {
  readonly id: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
}

/** Convert an AK tool descriptor to MCP shape (#84 publish). */
export const akToolToMcp = (tool: AkToolDescriptor): McpToolDescriptor => ({
  name: tool.id,
  description: tool.description,
  inputSchema: tool.inputSchema,
})

/** Convert an MCP tool descriptor to AK shape (#84 consume). */
export const mcpToolToAk = (tool: McpToolDescriptor): AkToolDescriptor => ({
  id: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
})

export type McpBridgeRegistry = {
  readonly publish: (tool: AkToolDescriptor) => 'registered' | 'conflict'
  readonly listPublished: () => readonly McpToolDescriptor[]
  readonly importRemote: (tools: readonly McpToolDescriptor[]) => readonly AkToolDescriptor[]
  readonly listImported: () => readonly AkToolDescriptor[]
}

/**
 * In-memory bridge that tracks published + imported tools (#84). Pure;
 * caller wires the actual MCP server over the transport.
 */
export const createMcpBridge = (): McpBridgeRegistry => {
  const published = new Map<string, McpToolDescriptor>()
  const imported = new Map<string, AkToolDescriptor>()

  return {
    publish: (tool) => {
      if (published.has(tool.id)) return 'conflict'
      published.set(tool.id, akToolToMcp(tool))
      return 'registered'
    },
    listPublished: () => [...published.values()].sort((a, b) => a.name.localeCompare(b.name)),
    importRemote: (tools) => {
      const out: AkToolDescriptor[] = []
      for (const t of tools) {
        const ak = mcpToolToAk(t)
        imported.set(ak.id, ak)
        out.push(ak)
      }
      return out
    },
    listImported: () => [...imported.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
}

/** Build an MCP tool-call wrapper from AK call args (#84). */
export const buildMcpToolCall = (toolId: string, args: Record<string, unknown>): McpToolCall => ({
  name: toolId,
  arguments: { ...args },
})
