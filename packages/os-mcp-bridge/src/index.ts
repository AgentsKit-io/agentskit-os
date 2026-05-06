export { discoverMcpServers, defaultMcpDiscoveryPaths, extractMcpServersFromJson } from './discover.js'
export type { McpDiscoveryOptions, McpServerDefinition, McpTransport } from './discover.js'

export { akToolToMcp, buildMcpToolCall, createMcpBridge, mcpToolToAk } from './bridge.js'
export type {
  AkToolDescriptor,
  McpBridgeRegistry,
  McpToolCall,
  McpToolDescriptor,
} from './bridge.js'
