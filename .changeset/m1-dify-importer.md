---
"@agentskit/os-import": minor
---

Promote `difyImporter` from detect-only placeholder to full M1 implementation. Walks `workflow.graph.nodes` + `workflow.graph.edges` and translates Dify node types:

| Dify type | AgentsKitOS kind |
|---|---|
| `start`, `end`, `answer` | `human` |
| `llm`, `agent` | `agent` (provider normalized: `azure_openai`/`openai` → openai, `google`/`vertex_ai` → gemini, `bedrock` → anthropic) |
| `if-else`, `question-classifier` | `condition` (logic stubbed to `"true"`, warning emitted) |
| `knowledge-retrieval`, `tool`, `http-request`, `code`, `template-transform`, `variable-aggregator`, `parameter-extractor`, `document-extractor`, `iteration`, `loop` | `tool` (`dify.<slug>`) |
| unknown | `tool` + `unknown_node_type` warning |

`start`-typed node used as flow entry when present, else first node. `if-else` / `question-classifier` emit `lossy_conversion` warning since Dify branching logic doesn't map 1-to-1.

All three importers (n8n, Langflow, Dify) now fully implemented.

Removed `tests/placeholders.test.ts` (no remaining placeholders). Updated CLI integration test for dify.
