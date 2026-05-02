---
"@agentskit/os-import": minor
---

Scaffold `@agentskit/os-import` package — migration importers. Sixth public package. Pure transformation; no I/O.

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
