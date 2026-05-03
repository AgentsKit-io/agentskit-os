# @agentskit/os-import

## 1.0.0-alpha.1

### Patch Changes

- Updated dependencies [84d2fed]
  - @agentskit/os-core@0.4.0-alpha.1

## 1.0.0-alpha.0

### Minor Changes

- ca6b190: Promote `difyImporter` from detect-only placeholder to full M1 implementation. Walks `workflow.graph.nodes` + `workflow.graph.edges` and translates Dify node types:

  | Dify type                                                                                                                                                            | AgentsKitOS kind                                                                                                      |
  | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
  | `start`, `end`, `answer`                                                                                                                                             | `human`                                                                                                               |
  | `llm`, `agent`                                                                                                                                                       | `agent` (provider normalized: `azure_openai`/`openai` → openai, `google`/`vertex_ai` → gemini, `bedrock` → anthropic) |
  | `if-else`, `question-classifier`                                                                                                                                     | `condition` (logic stubbed to `"true"`, warning emitted)                                                              |
  | `knowledge-retrieval`, `tool`, `http-request`, `code`, `template-transform`, `variable-aggregator`, `parameter-extractor`, `document-extractor`, `iteration`, `loop` | `tool` (`dify.<slug>`)                                                                                                |
  | unknown                                                                                                                                                              | `tool` + `unknown_node_type` warning                                                                                  |

  `start`-typed node used as flow entry when present, else first node. `if-else` / `question-classifier` emit `lossy_conversion` warning since Dify branching logic doesn't map 1-to-1.

  All three importers (n8n, Langflow, Dify) now fully implemented.

  Removed `tests/placeholders.test.ts` (no remaining placeholders). Updated CLI integration test for dify.

- b0b7295: Promote `langflowImporter` from detect-only placeholder to full M1 implementation. Walks `data.nodes` + `data.edges` (React-Flow shape) and translates Langflow components to AgentsKitOS flow nodes:

  - LLM components (matching `chat|llm|openai|anthropic|gemini|cohere|mistral|groq|ollama|bedrock`) → `agent` flow node + emitted `AgentConfig`. Provider auto-inferred from model prefix (`claude-*` → anthropic, `gemini-*` → gemini, `command-*` → cohere, else openai).
  - Chat input/output components → `human` node.
  - Tool / search / RAG / vector components → `tool` node (name encoded as `langflow.<slug>`).
  - Unfamiliar components → `tool` + `unknown_node_type` warning.

  `data.nodes[].data.node.template.model_name.value` (or `model` / `model_id`) extracted into `AgentConfig.model.model`.

  `data.edges` translated through node-id remap into flow edges.

  First node = entry. Empty-flow input throws.

  Dify remains detect-only placeholder. Updated README + tests accordingly.

- 1c2e0e4: Scaffold `@agentskit/os-import` package — migration importers. Sixth public package. Pure transformation; no I/O.

  `Importer` interface (`source`, `displayName`, `detect`, `parse`). `ImportResult` returns workspace identity, agents, flows, and typed `ImportWarning[]` (`unknown_node_type | unsupported_feature | lossy_conversion | missing_field | name_collision`).

  **n8n importer** — full M1 implementation. Walks workflow nodes + connections:

  - `@n8n/n8n-nodes-langchain.agent` and `n8n-nodes-base.agent` → `agent` flow node + emitted `AgentConfig`
  - `formTrigger` / `respondToWebhook` → `human` node
  - All other types → `tool` node (tool name derived from suffix)
  - Connections → flow edges
  - First node = entry by default
  - Warnings emitted for unfamiliar vendor namespaces

  **Langflow + Dify importers** — `detect` matches their JSON shape; `parse` throws `not yet implemented (M2)` placeholder.

  `builtInImporters` registry. `detectImporter(input, registry?)` and `importWorkflow(input, registry?)` helpers.

  Consumes `@agentskit/os-core` as `peerDependency`.

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
