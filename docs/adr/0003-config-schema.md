# ADR-0003 — Config Schema (Zod, Layered)

- **Status:** Accepted
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

AgentsKitOS targets three user personas with different config preferences:

- **Devs** — want pure TS, type-safe, version-controlled config.
- **Agencies / operators** — want YAML files committed alongside content.
- **Non-tech users** — want a GUI that writes config files for them.

All three must produce the **same canonical config object**. Source of truth must be a single Zod schema. Config must be layered (base → workspace → environment → runtime overrides).

## Decision

### 1. Single Zod schema in `@agentskit/os-core`

All config validates against one root schema. Schema versioned (`schemaVersion: 1`). Backward-compat migrations live in `@agentskit/os-core/migrations`.

### 2. Three input formats, one canonical output

| Input | Loader | Use case |
|---|---|---|
| `agentskit-os.config.ts` | `defineConfig()` helper, full TS types | Devs |
| `agentskit-os.config.yaml` | YAML parser → Zod | Agencies, ops, GitOps |
| GUI desktop settings | Tauri command writes YAML | Non-tech users |

All three resolve to the same `WorkspaceConfig` object.

### 3. Layered resolution (lowest → highest precedence)

1. **Built-in defaults** (shipped with package).
2. **Global user config** (`~/.agentskitos/config.yaml`).
3. **Workspace config** (`./agentskit-os.config.{ts,yaml}` + `./workspace.yaml`).
4. **Environment variables** (`AGENTSKITOS_*`, `.env`).
5. **Runtime overrides** (CLI flags, GUI session toggles).

Higher layers shallow-merge into lower. Arrays replace, not merge (explicit). `extends` field allows config inheritance.

### 4. Schema scope (v1)

```ts
WorkspaceConfig {
  schemaVersion: 1
  workspace: { id, name, isolation: 'strict' | 'shared', dataDir }
  providers: Record<name, ProviderConfig>     // refs @agentskit/adapters
  agents: AgentConfig[]                       // refs @agentskit/runtime
  flows: FlowConfig[]                         // OS-owned
  triggers: TriggerConfig[]                   // OS-owned
  memory: MemoryConfig                        // refs @agentskit/memory + OS vault
  tools: ToolRef[]                            // refs @agentskit/tools + plugins
  skills: SkillRef[]                          // refs @agentskit/skills + plugins
  plugins: PluginRef[]
  observability: ObservabilityConfig
  security: { firewall, piiRedaction, sandbox, auditLog }
  cloud?: CloudSyncConfig
}
```

Each sub-schema lives in its own file under `@agentskit/os-core/src/schema/`. Composed at root.

### 5. Hot reload

File-watch the resolved config files. On change, re-validate, diff, and emit `config:changed` event with patch. Subscribers (runtime, triggers, UI) react granularly. No full restart.

### 6. Secrets

Never in config files. Refs only: `${vault:openai_key}`. Resolved at runtime from OS vault (`@agentskit/os-security`). Lint rule blocks raw secret-looking strings (regex on commit hook).

## Consequences

- One schema, one source of truth, three ergonomic surfaces.
- Migrations versioned and tested. Old configs auto-migrate on load.
- GUI is a thin layer that produces the same YAML a human would write — fully round-trippable.
- CLI `agentskit-os config validate` / `config explain` / `config diff` ship in M1.

## Alternatives Considered

- **JSON schema only.** Rejected. Worse TS DX, weaker refinements.
- **TS-only config.** Rejected. Excludes ops + GUI users.
- **Convict / nconf.** Rejected. No type safety to user code.
- **Per-package configs (no root schema).** Rejected. Loses cross-package validation (e.g., agent referencing missing provider).
