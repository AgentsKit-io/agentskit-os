---
'@agentskit/os-mcp-bridge': patch
---

#84 / #85 / #220: add `createMcpBridge` + `akToolToMcp` / `mcpToolToAk` / `buildMcpToolCall` — pure transformers between AgentsKitOS tool descriptors and MCP shapes. Bridge registry tracks published + imported tools; transport (stdio / sse / http) and the auto-discover wiring (#85) live at the runtime boundary on top of `discoverMcpServers`.
