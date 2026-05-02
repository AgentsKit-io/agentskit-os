# ADR-0010 — Tool Side-Effect Declaration + Sandbox Levels

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Run modes (ADR-0009) need tools to self-declare what they do. Sandbox (O-2) needs a level model to choose isolation cost vs safety. Without both, "preview" can't decide what to block, and sandbox is a single binary toggle.

## Decision

### 1. `sideEffects` enum on every tool manifest

```ts
SideEffect = 'none' | 'read' | 'write' | 'destructive' | 'external'
```

| Value | Meaning | Examples |
|---|---|---|
| `none` | pure compute | string transform, math |
| `read` | observes state, no mutation | fs.read, db.select, http.get |
| `write` | mutates owned state | fs.write to workspace dir, db.insert into local sqlite |
| `destructive` | irreversible or wide-blast | fs.rm, db.drop, email.send, slack.post, payment.charge, k8s.delete |
| `external` | network egress to non-allowlisted host | any unallow-listed URL |

Tool may declare multiple, e.g. `['read', 'external']`. Mode engine uses **maximum severity**.

### 2. Sandbox levels

```ts
SandboxLevel = 'none' | 'process' | 'container' | 'vm' | 'webcontainer'
```

| Level | Isolation | Latency | Use |
|---|---|---|---|
| `none` | in-process | 0 | trusted built-ins only |
| `process` | child process, capability-restricted (seccomp / job-object) | <50ms | most tools |
| `container` | Docker / Podman / Firecracker-jailer | 100–500ms | code execution, shell, untrusted plugins |
| `vm` | full microVM (Firecracker, Cloud Hypervisor) | 1–3s | high-risk, regulated |
| `webcontainer` | StackBlitz WebContainer / Daytona browser sandbox | 200ms | dev/demos, browser-only |

Plugin contract for sandbox runtime: `SandboxRuntime` interface, registered via plugin (extension point per ADR-0012). Built-ins: `none`, `process`. Optional plugins ship `container`, `vm`, `webcontainer`.

### 3. Default policy matrix

| Tool sideEffect | Min sandbox |
|---|---|
| `none` | `none` |
| `read` | `process` |
| `write` | `process` |
| `destructive` | `container` |
| `external` | `container` (network namespace + egress allowlist per ADR-0011) |

Workspace can elevate (always container) but not weaken below matrix without `force: true` + warning.

### 4. RunMode × sideEffect matrix (ADR-0009)

| Mode | none | read | write | destructive | external |
|---|---|---|---|---|---|
| `real` | run | run | run | run + audit | run + audit + egress check |
| `preview` | run | run | **block** | **block** | **block** |
| `dry_run` | stub | stub | stub | stub | stub |
| `replay` | replay | replay | replay (no-op, log only) | replay (no-op, log only) | replay (no-op) |
| `simulate` | run/mocked | mocked | mocked | mocked | mocked |
| `deterministic` | run | run | run | run + require fixture | run + require fixture |

### 5. Schema location

```
packages/os-core/src/tools/
  side-effects.ts   # SideEffect enum + helpers
  sandbox.ts        # SandboxLevel + policy matrix + SandboxRuntime interface
```

Existing `ToolRef` (already in agent schema) extends to `ToolManifest` with `sideEffects` field. Plugins must declare; missing = treated as `external` (most restrictive).

### 6. Audit + denial events

`tool.invoke.denied` + `tool.invoke.escalated` events (ADR-0005). Carry `runMode`, `sideEffect`, `requestedSandbox`, `appliedSandbox`, `reason`.

## Consequences

- Preview mode actually safe — declarative.
- Sandbox cost paid only when warranted.
- Plugins explicit about danger surface.
- Adds plugin-author burden — mitigated by lint rule + default `external`.

## Alternatives Considered

- **Single boolean `sandbox: true`.** Rejected. No granularity.
- **Capabilities (ADR-0006) only, no sideEffects.** Rejected. Caps describe what's allowed, not what tool inherently does. Both needed.
- **Always container.** Rejected. Latency cost makes UX poor.

## Open Questions

- Sandbox warm-pool for sub-100ms tool calls.
- How to handle long-lived sandboxes for stateful tools.
- Cross-tool sandbox sharing (perf) vs isolation (safety).
