# RFC-0007 — Contract Freeze (Pre-1.0)

- **Status:** Draft
- **Authors:** @EmersonBraun
- **Created:** 2026-05-02
- **Updated:** 2026-05-02
- **Tracking issue:** TBD

## Summary

Define what counts as the **public contract** of AgentsKitOS, fix it ahead of 1.0, and enforce it in CI. Anything in the contract becomes semver-stable; anything outside is free to refactor without bumping majors.

## Motivation

The platform is meant to be the foundation for an ecosystem (plugins, embedders, marketplace). Past observation in adjacent ecosystems (Flowise, Langflow, early Dify): contract drift kills trust. We refuse that path (ADR-0001). Stability needs three things:

1. A precise definition of *what* is stable.
2. A snapshot mechanism so drift is detectable.
3. A semver discipline so consumers can plan.

Without RFC-0007, "public API" varies subtly per reviewer and changeset; freeze conversations stall on "is this internal?".

## Detailed Design

### What is "public contract"

Three concentric rings.

**Ring 0 — wire formats.** Bytes-on-disk and bytes-on-network shapes that may persist beyond a single process or be exchanged between AgentsKitOS instances.

- AuditBatch JSONL (`os-audit/file-batch-store`)
- AuditBatch SQL row shape (`os-audit/sqlite-batch-store`)
- CheckpointRecord JSONL (`os-storage/file-checkpoint-store`)
- CheckpointRecord SQL row shape (`os-storage/sqlite-checkpoint-store`)
- AgentsKitOS event envelope (`os-core/events/event` — CloudEvents 1.0 + AgentsKitOS extensions)
- Plugin manifest YAML (`os-core/config/plugin`)
- Bundle JSON (`os-marketplace-sdk/bundle`)
- Lockfile YAML (`os-cli/lock`)

Breaking Ring 0 requires a **major version + migration tool**.

**Ring 1 — TypeScript public exports of `public`-tier packages.** Per ADR-0014 these are:
- `@agentskit/os-core`
- `@agentskit/os-cli`
- `@agentskit/os-flow`
- `@agentskit/os-runtime`
- `@agentskit/os-runtime-agentskit`
- `@agentskit/os-storage`
- `@agentskit/os-audit`
- `@agentskit/os-marketplace-sdk`
- `@agentskit/os-observability`
- `@agentskit/os-observability-otel`

Public exports = anything reachable via the package's `exports.import` entry point (default `dist/index.js`).

Breaking Ring 1 requires a **major version**. Type widenings, optional-field additions, and new exports are minor; renaming, deletion, or required-field additions are major.

**Ring 2 — semantic behaviors.** Documented behaviors not necessarily encoded in types:
- Deterministic event ordering per workspace
- AuditBatch chain continuity (`prevBatchHash`)
- ed25519 signature scheme (`os-core/AuditSignature`)
- ULID id format (`AnyEvent.id`)
- `RunMode` outcome mapping (ADR-0009)

Breaking Ring 2 requires a **major version + ADR amendment**.

`bundled-private` and `internal-only` packages have **no public contract**. They may break freely as long as their `public`-tier consumers stay green.

### Snapshot mechanism

`scripts/check-public-api.mjs` walks each `public`-tier package, parses its built `dist/index.d.ts`, and extracts a deterministic JSON of:

```json
{
  "exports": {
    "createX": { "kind": "function" },
    "X": { "kind": "type" },
    "Y": { "kind": "class" }
  }
}
```

Snapshots live in `.agentskitos-api/<package-name>.json`, committed to the repo.

CI invokes the script in two modes:
- `--check` (default in CI): regenerate, diff against committed; fail if any non-additive change is present without an accompanying changeset that bumps `major`.
- `--update`: regenerate and overwrite snapshots; used in the local workflow when a public surface change is intentional.

Additive changes (new exports) don't fail CI but appear in the diff so reviewers see them.

### Semver discipline

Until 1.0:
- All `public`-tier packages stay at `0.x`.
- Any breaking Ring 0 / Ring 1 / Ring 2 change is allowed in a **minor bump** as long as it is documented in a changeset.
- The 1.0 release commits to RFC-0007: thereafter, breakage costs a major.

After 1.0:
- Major: breaking Ring 0/1/2.
- Minor: new exports, new optional fields, new event types, new metric names.
- Patch: bug fixes, doc updates, internal refactors that don't touch the snapshot.

### Deprecation policy

- Mark with `@deprecated` JSDoc on the export.
- Keep functional for at least one minor cycle.
- Remove only on a major.
- Document migration in CHANGELOG and at the top of the package README.

Deprecation tags appear in the snapshot as `{ "kind": "function", "deprecated": true }` so the CI diff highlights them.

### What's *not* in the contract

- Implementation details of any class (private fields, prototype layout).
- Test fixtures / `_helpers.ts` files.
- `agentskitos.*` keys in `package.json` beyond `distribution` + `stability`.
- Tarball/archive layout of plugin bundles (only the JSON metadata is contract).
- Transitive dependency tree.
- Build artifact paths beyond what `exports` declares.

## Alternatives Considered

- **Freeze nothing pre-1.0.** Status quo. Rejected — embedders need a stability signal earlier than 1.0 to start integrating.
- **Freeze everything.** Rejected — overconstrains internals; would slow iteration on `os-runtime` handlers and `os-cli` plumbing where the contract is the *outcome*, not the function shapes.
- **Per-package per-RFC freeze.** Rejected — too fragmented; consumers need one rule.

## Drawbacks

- Snapshot churn during M2 (new public packages, ADR-driven additions). Acceptable since they're additive.
- `.d.ts` parsing is a moving target — if `tsup`/`tsc` output format shifts, the script needs updating. Mitigation: pin the parsing logic to declarations we control.
- False positives for purely structural type changes (e.g. literal-union order). Mitigation: snapshot stores names + kinds only, not full type shapes.

## Migration Path

1. Land RFC-0007 (this document).
2. Land `scripts/check-public-api.mjs` with initial snapshots for current public packages.
3. Wire CI to run `pnpm api:check` after build.
4. Add `pnpm api:update` to local workflow + reviewer checklist.
5. At 1.0 cut, flip semver clock — breakage costs majors.

## Security & Privacy Impact

None directly. The freeze does fix the audit chain (Ring 0) and signature scheme (Ring 2) so consumers can rely on tamper-evidence semantics across versions.

## Open Questions

- [ ] Should `private`-package public surfaces be tracked as Ring 1 once they're depended on by a public package's types?
- [ ] How do we treat structural-typed bindings (`os-runtime-agentskit`, `os-observability-otel`) where the "real" contract lives in an upstream library? Probably: snapshot our locally-defined shapes only.
- [ ] Codemod policy for Ring 0 wire-format breakage: ship inside `os-cli`, or as a separate `agentskit-os-migrate` package?
