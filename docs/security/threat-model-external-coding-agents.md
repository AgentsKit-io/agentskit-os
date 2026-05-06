# Threat model: external coding-agent orchestration

**Status:** living document  
**Scope:** subprocess-based coding agents (Codex, Claude Code, Cursor, Gemini, and similar CLIs) invoked by AgentsKitOS dev orchestration, flows, and marketplace-adjacent surfaces.  
**Related:** complements GitHub issues [#336](https://github.com/AgentsKit-io/agentskit-os/issues/336), [#337](https://github.com/AgentsKit-io/agentskit-os/issues/337), [#342](https://github.com/AgentsKit-io/agentskit-os/issues/342), [#352](https://github.com/AgentsKit-io/agentskit-os/issues/352)–[#361](https://github.com/AgentsKit-io/agentskit-os/issues/361), [#363](https://github.com/AgentsKit-io/agentskit-os/issues/363), [#367](https://github.com/AgentsKit-io/agentskit-os/issues/367), [#379](https://github.com/AgentsKit-io/agentskit-os/issues/379) (this document).

---

## 1. Assets (what we protect)

| Asset | Description |
|--------|-------------|
| **Source code & IP** | Repository contents, branches, unmerged changes. |
| **Secrets & credentials** | API keys, tokens, vault material, `.env` and local vault files. |
| **Build & CI integrity** | Pipelines, lockfiles, dependency graphs, release artifacts. |
| **Operator trust** | Decisions recorded in traces, HITL queues, audit logs. |
| **End-user / org data** | Data reachable from the workspace (logs, fixtures, copied PII). |
| **Provider-side data** | Prompts and telemetry retained by third-party CLIs and their backends. |

---

## 2. Trust boundaries

```text
[Operator / OS UI] ──► [AgentsKit runtime + policy]
                              │
                              ▼
                    [Coding-agent adapter]
                              │
                              ▼
              [External CLI process + provider cloud]
                              │
                              ▼
        [Repo filesystem / git remotes / network egress]
```

- **Boundary A:** OS configuration and policy vs. arbitrary task text from issues, chats, or webhooks.  
- **Boundary B:** Adapter contract vs. actual CLI behavior (binary substitution, version skew).  
- **Boundary C:** Local workspace vs. remote Git hosting and package registries.  
- **Boundary D:** Marketplace / third-party plugins supplying prompts or tools into the same run context.

---

## 3. Threat actors (abbreviated)

- Malicious or compromised **task source** (issue body, PR comment, poisoned template).  
- **Rogue or trojaned CLI** on `PATH` or misinstalled agent binary.  
- **Insider** with legitimate credentials abusing broad scopes.  
- **Dependency / supply-chain** attacker (malicious package post-install).  
- **Provider / SaaS** misuse, retention, or subpoena of stored prompts.

---

## 4. Attack paths & mitigations

### 4.1 Prompt injection → privileged action

**Path:** Untrusted text in issue/PR/webhook is concatenated into agent instructions; model follows hidden directives (exfil, `curl`, destructive edits).

**Mitigations:**  
- Policy-as-code gates on sensitive tools and irreversible actions ([#336](https://github.com/AgentsKit-io/agentskit-os/issues/336)).  
- Separate **read vs write** scopes and explicit **grants** on the `CodingTaskRequest` contract.  
- **Dry-run** and diff preview before apply; HITL for high-risk flows ([#337](https://github.com/AgentsKit-io/agentskit-os/issues/337)).  
- **Output guards** and egress allowlists (see ADR on egress / tool sandbox).

**Residual risk:** Determined injection against weak policies or missing HITL still possible; models are stochastic.

---

### 4.2 Source exfiltration

**Path:** Agent instructed to encode secrets or source into outbound network, gist, or paste.

**Mitigations:**  
- Default-deny **egress** unless allowlisted host/action.  
- **Secret scanning** on outbound artifacts where applicable.  
- **Git worktree isolation** per task ([#363](https://github.com/AgentsKit-io/agentskit-os/issues/363)) to limit blast radius.  
- Minimize tokens in logs; **redaction** in traces and CLI (`doctor` / `creds` must not print values).

**Residual risk:** Side channels (timing, encoded file names) are hard to eliminate fully.

---

### 4.3 Shell misuse & command injection

**Path:** Agent runs shell with attacker-controlled strings; chaining to `rm`, credential harvest, lateral movement.

**Mitigations:**  
- Sandbox / spawn policy for subprocesses; non-interactive, no TTY where possible.  
- Capability flags (`run_shell`, `run_tests`) off unless granted.  
- Timeouts and cancellation hooks on long runs.

**Residual risk:** Shell-on by policy for legitimate workflows reopens the class.

---

### 4.4 Secret leakage via env, logs, and traces

**Path:** Provider inherits full environment; crash dumps or `--json` logs embed keys; trace exporter ships secrets.

**Mitigations:**  
- **Vault** and scoped injection of keys per provider ([#375](https://github.com/AgentsKit-io/agentskit-os/issues/375) and follow-ups).  
- Document **least privilege** env for each adapter.  
- Signed / structured **audit** with field-level redaction policies (see [hipaa-safe-harbor-coverage.md](./hipaa-safe-harbor-coverage.md), #182 / #187 / #439).

**Residual risk:** Operator misconfiguration (copy-paste into issues) remains a human factor.

---

### 4.5 Malicious diffs & merge attacks

**Path:** Agent proposes plausible-looking changes hiding backdoors, license laundering, or lockfile downgrades.

**Mitigations:**  
- Required **test** and **review** gates in pipeline templates (e.g. issue→PR).  
- **Conformance** and provider certification for predictable failure modes ([#374](https://github.com/AgentsKit-io/agentskit-os/issues/374)).  
- Multi-provider review / benchmark for high-risk repos ([#366](https://github.com/AgentsKit-io/agentskit-os/issues/366)).

**Residual risk:** Logic bugs without test coverage can still ship.

---

### 4.6 Dependency & supply-chain compromise

**Path:** Post-install scripts, compromised registry, typosquat packages during agent-driven upgrades.

**Mitigations:**  
- Lockfile discipline; optional **integrity verifier** workflows (see CLI roadmap).  
- Marketplace **provenance / SBOM** ([#342](https://github.com/AgentsKit-io/agentskit-os/issues/342)).  
- Restrict **network** during install phases where feasible.

**Residual risk:** First-party dependency compromise is largely out of band.

---

### 4.7 CI abuse & token scope

**Path:** Stolen `GITHUB_TOKEN` or overly broad PAT used from agent shell to modify other repos or org settings.

**Mitigations:**  
- Fine-scoped tokens; **OIDC** where available; separate bot identities.  
- Policy: which flows may call `github.*` tools and from which triggers.  
- Incident playbook: [stolen-ci-pat-playbook.md](./stolen-ci-pat-playbook.md) (#442).

**Residual risk:** Org-level mis-scoped tokens bypass product controls.

---

### 4.8 Provider log retention & subprocess trust

**Path:** Provider logs prompts containing secrets; binary is swapped for a wrapper that exfiltrates.

**Mitigations:**  
- **Provider conformance** + documented install verification (`agentskit-os coding-agent conformance`).  
- Pin versions; integrity check on known install paths where possible.  
- Enterprise guidance: data processing terms, retention limits, customer-managed keys where offered.

**Residual risk:** Full trust in third-party binary and cloud remains.

---

## 5. Mapping mitigations to product controls

| Control area | Mechanism (issue / ADR) |
|----------------|-------------------------|
| **Policy profiles** | [#336](https://github.com/AgentsKit-io/agentskit-os/issues/336) — `security.workspacePolicy` + `evaluateWorkspacePolicyAtRunStart` / `evaluateWorkspacePolicyBeforeTool` in `@agentskit/os-core` |
| **Sandboxing** | Worktrees [#363](https://github.com/AgentsKit-io/agentskit-os/issues/363), tool sandbox ADRs |
| **Egress allowlists** | ADR egress / plugin overrides |
| **Audit logs** | Audit signing ADR, observability package |
| **Redaction** | Trace / export pipelines (observability) |
| **Marketplace provenance** | [#342](https://github.com/AgentsKit-io/agentskit-os/issues/342) |
| **Human gates** | [#337](https://github.com/AgentsKit-io/agentskit-os/issues/337) HITL inbox |

### 5.1 Mitigation pillars × attack paths (#379)

Legend: **P** = primary control for that path, **S** = supporting / defense in depth, **—** = not the main lever.

| Pillar ↓ / §4 → | 4.1 Injection | 4.2 Exfil | 4.3 Shell | 4.4 Secrets | 4.5 Diffs | 4.6 Supply chain | 4.7 CI abuse | 4.8 Provider |
|-----------------|---------------|-----------|-----------|---------------|-----------|------------------|--------------|----------------|
| **Policy profiles** (`workspacePolicy`, tool gates) | P | S | P | S | S | S | P | S |
| **Sandboxing & isolation** (worktrees, spawn policy) | S | P | P | — | S | S | — | S |
| **Egress allowlists** | S | P | S | — | — | P | S | — |
| **Audit logs & attest** | S | S | S | P | S | S | P | S |
| **Redaction & exports** | — | S | — | P | — | — | S | S |
| **Marketplace provenance** | S | — | — | — | S | P | — | S |
| **HITL inbox & traces** | P | S | S | S | P | S | S | S |

---

## 6. Residual risks (accepted until owned)

- Stochastic model behavior under adversarial prompts.  
- Compromised provider or CLI outside our verification window.  
- Org-level credential sprawl not managed by AgentsKit.  
- Cross-repo confusion when multiple remotes or submodules are present.

---

## 7. Suggested follow-up issues (file when unowned) — P0 / P1 backlog (#379)

Open discrete GitHub issues for anything below that does not already have an owner; do not treat this list as done until tickets exist or the risk is explicitly accepted.

| Suggested issue title | Priority | Tracker | Notes |
|------------------------|----------|---------|--------|
| Automated egress policy tests on real coding-agent runs | **P1** | [#438](https://github.com/AgentsKit-io/agentskit-os/issues/438) | Integration coverage for default-deny + allowlist drift. |
| Trace / export **redaction profiles** (regime-specific defaults) | **P1** | [#439](https://github.com/AgentsKit-io/agentskit-os/issues/439) | HIPAA-style defaults; tie to observability pipelines. |
| CI gate: fail when `coding-agent conformance --json` is not certified for claimed providers | **P1** | [#440](https://github.com/AgentsKit-io/agentskit-os/issues/440) | Bridges [#374](https://github.com/AgentsKit-io/agentskit-os/issues/374) to release policy. |
| Provider **binary attestation** or install-path integrity checks | **P0** | [#441](https://github.com/AgentsKit-io/agentskit-os/issues/441) | Reduces trojaned-CLI risk in §4.8; pair with install docs. |
| **Stolen CI / PAT** abuse playbooks and least-privilege templates | **P1** | [#442](https://github.com/AgentsKit-io/agentskit-os/issues/442) | See [ci-least-privilege-coding-agents.md](./ci-least-privilege-coding-agents.md). |
| **Prompt firewall** regression suite for issue→PR and webhook-sourced prompts | **P0** | [#443](https://github.com/AgentsKit-io/agentskit-os/issues/443) | When prompt firewall ships beyond static deny lists. |

---

## 8. Review gate & production-readiness sign-off (#379)

Before external coding-agent integrations are marketed or labeled **production-ready**, complete the following with a named reviewer (security, platform, or delegated engineering lead):

- [ ] Assets and trust boundaries in §1–§2 are still accurate for the shipping provider set.  
- [ ] Each §4 attack path has an **owned** mitigation in code or ops runbooks (or an accepted residual in §6).  
- [x] The §7 follow-up backlog has open trackers ([#438](https://github.com/AgentsKit-io/agentskit-os/issues/438) – [#443](https://github.com/AgentsKit-io/agentskit-os/issues/443)) — filed 2026-05-06; sign-off blocks on those issues, not on the doc.
- [ ] The matrix in §5.1 has been walked with the team; gaps have **open** issues from §7 or written waivers.  
- [ ] HITL ([#337](https://github.com/AgentsKit-io/agentskit-os/issues/337)) and policy ([#336](https://github.com/AgentsKit-io/agentskit-os/issues/336)) are wired for any tool or run mode exposed to untrusted prompt sources.  
- [ ] Marketplace / plugin provenance ([#342](https://github.com/AgentsKit-io/agentskit-os/issues/342)) is understood for any third-party prompt or tool surface in scope.

Updates to this document are expected when new providers, triggers, policy engines, or data-processing terms land.
