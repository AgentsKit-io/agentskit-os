# RFC-0002 — `agentskit-os.lock` Workspace Lock File

- **Status:** Draft
- **Authors:** @EmersonBraun
- **Created:** 2026-05-01
- **Updated:** 2026-05-01
- **Tracking issue:** TBD

## Summary

YAML/TS config alone doesn't pin **what actually ran**. Two teammates same config → different model versions, plugin patches, prompt revisions. Add `agentskit-os.lock` (content-hashed lockfile) so flows are byte-reproducible across machines and over time.

## Motivation

- **Reproducibility.** Required for clinical (ADR-0009 deterministic) and audit (ADR-0008 chain validates the *what*, lockfile validates the *who/when*).
- **Sharing.** Sending a flow YAML to a colleague who installs a newer plugin version = silent drift. Lockfile pins exact version + integrity hash.
- **Diff-able.** PR review of "what changed in agent setup" today = guess from package-lock + config diffs. Lockfile makes it one file.
- **Replay.** Time-travel (G-5) needs to know which plugin/model version was running at the time. Lockfile = source of truth.
- **Ecosystem.** pnpm/npm/bun all have lockfiles for code; agent stack doesn't. We fix.

## Detailed Design

### 1. File location + format

`agentskit-os.lock` at workspace root. YAML for diff-friendliness. Generated, never hand-edited.

```yaml
lockfileVersion: 1
generatedAt: 2026-05-01T12:00:00Z
generatedBy: agentskit-os/0.1.0
workspace:
  id: marketing-acme
  configHash: sha256:7f3a...
  configPath: agentskit-os.config.yaml
plugins:
  - id: github-pr-bot
    version: 1.4.2
    source: marketplace:github-pr-bot
    integrity: sha512-abc...
    signature:
      algorithm: ed25519
      publicKey: ...
      signature: ...
    resolvedAt: 2026-05-01T12:00:00Z
    contributes: [tool, trigger]
    permissions:
      - net:fetch:api.github.com:invoke
      - vault:github_token:read
agents:
  - id: researcher
    version: 0.3.0
    contentHash: sha256:e21...
    model:
      provider: anthropic
      name: claude-sonnet-4-6
      pinnedVersion: '20260415'        # provider-resolved snapshot id
      params: { temperature: 0, maxTokens: 4000 }
    promptHash: sha256:a91...
flows:
  - id: pr-review
    version: 0.2.1
    contentHash: sha256:b42...
    nodes:
      - id: fetch
        kind: tool
        toolRef: github.pr.read
        toolVersion: 1.4.2
      - id: review
        kind: agent
        agentRef: researcher@0.3.0
providers:
  - id: anthropic
    apiVersion: '2026-04-01'
tools:
  - id: github.pr.read
    pluginId: github-pr-bot
    version: 1.4.2
    contentHash: sha256:c83...
    sideEffects: [read, external]
schemas:
  osCore: 0.4.2
  workspaceConfig: 1
templates:
  - id: marketing/3-way-compare
    version: 0.1.0
    contentHash: sha256:d77...
```

### 2. Content hashing

- Plugin: `integrity` = subresource integrity hash of distributed bundle (matches npm/pnpm).
- Agent / flow / prompt / template: `contentHash` = SHA-256 over canonicalized JSON of resolved content (post-merge, pre-runtime).
- `configHash` = hash of fully-resolved config (post-layer-merge per ADR-0003 §3).

### 3. Generation + verification

```bash
agentskit-os lock                 # generate / refresh
agentskit-os lock --check         # CI: fail if drift between config and lock
agentskit-os install --frozen-lockfile   # refuse mismatch
agentskit-os run --frozen-lockfile       # production
```

Lockfile is the contract for `--frozen-lockfile`. Mismatch → `lock.drift_detected` (ADR-0007).

### 4. Model pinning

Provider adapters expose `resolvePinnedVersion(modelName, requestedAt)` → snapshot id. Stored in lock. On replay, adapter is asked for that exact snapshot. If provider retires it, run fails with `model.snapshot_unavailable` and surfaces migration path.

### 5. Determinism interaction (ADR-0009)

`mode: deterministic` requires `--frozen-lockfile`. Validator checks every model has `pinnedVersion`, every tool has `version` + `contentHash`, every prompt has `promptHash`. Missing = run rejected.

### 6. Diff tooling

`agentskit-os lock diff <ref-a> <ref-b>` — semantic diff:

```
- plugin: github-pr-bot 1.4.1 → 1.4.2
- agent: researcher prompt sha256:a90 → sha256:a91 (3 lines changed)
+ tool added: postgres.query 0.1.0
```

Renders in PR via GitHub Action.

### 7. Git ignore + commit

`agentskit-os.lock` is **committed**. `.agentskitos/` runtime dir is gitignored.

### 8. Cloud sync (M8)

Lockfile replicates as part of workspace sync. Conflict resolution: lockfile is regenerated post-merge; never manually merged.

## Alternatives Considered

- **Rely on plugin manifest versions only.** Rejected. Prompts, templates, agent configs not versioned.
- **Per-plugin lockfile.** Rejected. Cross-plugin consistency lost.
- **JSON not YAML.** Rejected. YAML diffs better in review.
- **Lockfile = TS file.** Rejected. Generated artifact should be diffable, not executable.

## Drawbacks

- One more file in the repo.
- Generation takes time on slow disks (full hash sweep).
- Provider-pinned model snapshots may be retired before replay needed → must offer remediation.

## Migration Path

- Pre-M1: ship in M1 alongside `agentskit-os init`. New workspaces lock from day one.
- Existing workspaces (none yet): `agentskit-os lock` generates first lock.

## Security & Privacy Impact

- **Net positive.** Integrity hashes detect tampered plugins.
- **Threat:** lockfile commits expose plugin install graph to public repo viewers. Acceptable; aligns with `package-lock.json` norms.
- **Threat:** model snapshot id may leak provider's internal versioning. Coordinate with adapter authors; redact if requested.

## Open Questions

- [ ] Lockfile schema migrations: how to bump v1 → v2.
- [ ] Sub-workspace / monorepo: one lock or per-workspace?
- [ ] Deterministic prompt rendering: do we hash post-template-substitution or pre? (Probably both — pre for review, post for replay.)
- [ ] Cross-platform line-ending normalization in canonical JSON.
