# OS ↔ AgentsKit Compatibility Matrix

ADR-0002 makes AgentsKitOS depend on AgentsKit as `peerDependency`. Peer ranges alone do not document **which combinations were tested and shipped together**. This file does.

## Why this matters

- AgentsKit is the runtime (LLM adapters, ReAct loop, memory, tools, skills, observability primitives, eval).
- AgentsKitOS is the OS layer (workspace, flow, triggers, marketplace, desktop, plugins, vault, cloud-sync).
- Mismatched versions = subtle runtime breaks (signature drift, missing exports, schema skew). One row of bug parity.

## Rules

1. **Every `@agentskit/os-*` release pins a tested AgentsKit minor range.** Range, not exact, so users keep patch upgrades free.
2. **CI runs the contract test suite (`@agentskit/os-contracts-test`, planned) against the lowest + highest supported AgentsKit minor.** PR fails if either breaks.
3. **AgentsKit major bump → coordinated RFC + OS major bump.** No silent jump.
4. **Deprecation window: 1 minor.** When OS drops support for an AgentsKit minor, mark it deprecated in the previous minor with console warning + matrix annotation.
5. **Bot opens PR on every AgentsKit release.** Runs full matrix; either expands range or files incompat issue.

## Current matrix

> Pre-M1 placeholder. Concrete numbers populated when first AgentsKit-consuming OS package ships (M1, `os-cli`).

| `@agentskit/os-core` | `@agentskit/runtime` | `@agentskit/adapters` | `@agentskit/memory` | `@agentskit/tools` | `@agentskit/skills` | `@agentskit/observability` | `@agentskit/eval` | Status |
|---|---|---|---|---|---|---|---|---|
| 0.0.x | n/a (no runtime dep yet) | n/a | n/a | n/a | n/a | n/a | n/a | M0 schema-only |
| 0.1.x | ^x.y.0 | ^x.y.0 | ^x.y.0 | ^x.y.0 | ^x.y.0 | ^x.y.0 | ^x.y.0 | M1 placeholder |

## Per-OS-package matrices

Each `@agentskit/os-*` package owns a section here when it begins consuming AgentsKit. Schema:

```
### @agentskit/os-<pkg>

| os-<pkg> version | agentskit deps | tested node | tested OS | notes |
|---|---|---|---|---|
| 0.1.0 | runtime ^1.4.0, memory ^0.7.0 | 20.x, 22.x | macOS 14, Ubuntu 22.04, Win 11 | initial M1 |
```

## Process

### Releasing an OS package

1. CI runs contract suite against `peerDependency` range floor + ceiling.
2. Changeset includes a row update to this file.
3. Reviewer rejects if matrix not updated.

### AgentsKit minor lands

1. Bot opens PR titled `chore(compat): test against agentskit X.Y`.
2. CI extends matrix.
3. Pass → merge, bump `peerDependency` ceiling next OS minor.
4. Fail → file `compat:agentskit@X.Y` issue, label `breaking`, triage.

### AgentsKit major lands

1. RFC required (OS-side) before OS bumps to support it.
2. RFC includes: breaking-change inventory, migration codemod plan, deprecation timeline.
3. Old OS major continues receiving patches against old AgentsKit major for 6 months.

## Enforcement

- CI rule (`scripts/check-compat-matrix.ts`, planned M1): for every changeset touching `package.json` peer ranges, this file must change.
- Codeowners: this file requires maintainer review.
- Public docs site renders the table from this file directly. Never out of sync.

## Open Questions

- [ ] Where to host the bot? Likely GitHub Actions cron + reusable workflow.
- [ ] Whether to publish a `@agentskit/os-compat` lockfile package downstream consumers can pin to.
- [ ] Lockstep mode for `os-runtime` (if introduced) vs library-style peer for everything else.
