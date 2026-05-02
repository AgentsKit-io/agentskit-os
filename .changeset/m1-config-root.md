---
"@agentskit/os-core": minor
---

Add `ConfigRoot` capstone schema. Composes Workspace, Vault, Security, Observability, optional Cloud, plus arrays of plugins, agents, flows, triggers, and a memory map. Validates cross-references via `superRefine`:

- `workspace.schemaVersion` matches root `schemaVersion`
- unique ids across plugins, agents, flows, triggers
- every `trigger.flow` resolves to a real `flow.id`
- every `flow.nodes[].agent` (for agent nodes) resolves to a real `agent.id`
- every `agent.memory.ref` resolves to a key in the memory map
- when `security.requireSignedPlugins` is true, every plugin must have a signature

New subpath export `@agentskit/os-core/schema/config-root`. M1 schema layer is complete.
