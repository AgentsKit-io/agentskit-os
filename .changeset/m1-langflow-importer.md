---
"@agentskit/os-import": minor
---

Promote `langflowImporter` from detect-only placeholder to full M1 implementation. Walks `data.nodes` + `data.edges` (React-Flow shape) and translates Langflow components to AgentsKitOS flow nodes:

- LLM components (matching `chat|llm|openai|anthropic|gemini|cohere|mistral|groq|ollama|bedrock`) → `agent` flow node + emitted `AgentConfig`. Provider auto-inferred from model prefix (`claude-*` → anthropic, `gemini-*` → gemini, `command-*` → cohere, else openai).
- Chat input/output components → `human` node.
- Tool / search / RAG / vector components → `tool` node (name encoded as `langflow.<slug>`).
- Unfamiliar components → `tool` + `unknown_node_type` warning.

`data.nodes[].data.node.template.model_name.value` (or `model` / `model_id`) extracted into `AgentConfig.model.model`.

`data.edges` translated through node-id remap into flow edges.

First node = entry. Empty-flow input throws.

Dify remains detect-only placeholder. Updated README + tests accordingly.
