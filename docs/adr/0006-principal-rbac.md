# ADR-0006 — Principal & Capability-Based RBAC

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Multiple subsystems need to answer "who is acting?": vault access, trigger dispatch, plugin permission grants, audit log signing, marketplace install, cloud-sync replication, multi-workspace isolation, team RBAC (M8).

Current state: only `WorkspaceConfig.workspace.isolation: 'strict' | 'shared'`. No actor model. Adding identity at M8 = breaking every consumer. Define now.

Capability-based (object-capabilities) preferred over role lists: composable, least-privilege by default, plugin-friendly, no central role registry to keep in sync.

## Decision

### 1. Principal types

```ts
Principal =
  | { kind: 'user';    id: UserId;    workspaceId: WorkspaceId }
  | { kind: 'agent';   id: AgentId;   workspaceId: WorkspaceId; parent?: PrincipalRef }
  | { kind: 'plugin';  id: PluginId;  workspaceId: WorkspaceId; signature: PluginSignature }
  | { kind: 'trigger'; id: TriggerId; workspaceId: WorkspaceId }
  | { kind: 'system';  id: 'os-core' | 'os-cli' | 'os-runtime' }
  | { kind: 'service'; id: ServiceId; workspaceId: WorkspaceId } // cloud-sync, scheduled jobs
```

Every event (ADR-0005), every audit entry, every vault read, every flow run carries a `principalId` resolvable to one of the above.

### 2. Capabilities (object-cap, not role)

```ts
Capability {
  id: string                    // ULID
  resource: ResourceRef         // 'vault:openai_key', 'flow:billing-pipeline', 'net:fetch:api.github.com'
  actions: Action[]             // ['read'], ['invoke'], ['publish']
  constraints?: {               // optional narrowing
    rateLimit?: { perMin: number }
    budget?: { usd: number; tokens: number }
    expiresAt?: string
    args?: ZodSchema             // e.g. only allow tool call w/ specific shape
  }
  delegatable: boolean
  issuer: PrincipalRef
  proof?: Signature             // when delegated
}
```

Resource grammar: `<domain>:<id>[:<sub>]`. Domains: `vault`, `flow`, `agent`, `tool`, `skill`, `net`, `fs`, `event`, `plugin`, `marketplace`, `workspace`.

### 3. Resolution

Per-call `AuthContext { principal, capabilities: Capability[] }`. Subsystem checks `hasCap(ctx, resource, action)` at every boundary. No ambient authority. No global role table.

### 4. Delegation

Agent spawning sub-agent attenuates: child receives **subset** of parent caps with optional further constraints. Constraints monotonic (only narrower). Recorded as signed delegation chain in audit log.

### 5. Plugin grants

Plugin manifest declares **requested** capabilities (from EPIC `PluginCapability`). Install flow shows user diff vs current grant; user approves → caps issued, signed by workspace key. Revocable any time. Runtime enforces — plugin cannot escalate.

### 6. Workspace isolation

`isolation: 'strict'` → cross-workspace cap delegation forbidden. `isolation: 'shared'` → explicit cross-workspace caps allowed, audited. Replaces today's enum-only field with enforcement semantics.

### 7. Roles = sugar over caps (M8)

Team RBAC (`owner`, `editor`, `viewer`) compiles to predefined cap bundles. Not a separate model. Keeps core small; team layer optional.

### 8. Audit

Every cap issuance, delegation, revocation, denied check → `system.audit.cap.*` event (ADR-0005), signed batches (M6 sign infra).

## Consequences

- Vault, triggers, plugins, marketplace, cloud-sync all consume one model from M1.
- Multi-workspace isolation enforced not advisory.
- Team RBAC + SSO at M8 are sugar, not rewrites.
- Delegation chain enables supply-chain security (plugin can't outgrow grant).
- Adds `AuthContext` plumbing to every subsystem boundary — accepted cost.
- Forces `PluginCapability` schema (already in os-core) to align with this Capability shape — pre-M1 refactor required.

## Alternatives Considered

- **Role-based ACL (Casbin/CASL-style).** Rejected. Central role table = sync burden + plugin authors can't define new roles cleanly.
- **OAuth scopes only.** Rejected. Doesn't model in-process actors (agent, trigger, system).
- **Defer to M8.** Rejected. Retrofit breaks vault, plugin, marketplace consumers.
- **Macaroons.** Considered. Caveat-based attenuation matches well; revisit as impl detail of `Capability.constraints` + delegation. Not adopted as wire format yet — keep JSON Zod for tooling parity.

## Open Questions (RFC follow-ups)

- Signing key rotation semantics for delegated caps.
- Offline cap verification when `os-cloud-sync` partition.
- Cap GC: when does a revoked cap stop appearing in audit projections.
