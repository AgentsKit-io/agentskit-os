# Stolen CI / PAT incident playbook (#442)

Operational runbook for a suspected leak or theft of a CI token, GitHub PAT, or
provider API key used by coding-agent automation. Pairs with
[threat-model-external-coding-agents.md](./threat-model-external-coding-agents.md)
§4.7 (CI abuse) and [ci-least-privilege-coding-agents.md](./ci-least-privilege-coding-agents.md).

> Not legal advice. Customer notification, regulator notification, and forensic
> retention requirements depend on your jurisdiction and program — escalate
> early.

---

## 0. When to declare an incident

Declare an incident if **any** of the following is suspected:

- A PAT or `GITHUB_TOKEN` checked into a public repo, gist, paste site, or shared screen.
- A provider key (Anthropic, OpenAI, Google, etc.) appearing in a trace export, audit log, or shipped artifact.
- An unexpected workflow run, branch protection change, or release tag created by a bot identity.
- A dependency install that ran an unrecognized post-install script after coding-agent activity.

Severity rule of thumb: any token with **write** scope on `main` or **publish** on a registry → **Sev 1**.

---

## 1. Contain — first 15 minutes

| Step | Owner | Notes |
|------|-------|-------|
| Revoke the token at the issuer | on-call | GitHub → Settings → Developer settings → PATs (classic and fine-grained). Anthropic / OpenAI / Google → revoke + create a new key in a new project. |
| Disable the workflow if it can re-trigger | on-call | `gh workflow disable <name>` or pause the relevant Actions environment. |
| Pause provider runs | on-call | Set `CODING_AGENT_CONFORMANCE_PROVIDERS=""` to short-circuit the gate; flip the workspace policy to `runMode=manual`. |
| Snapshot logs | on-call | Pull last 24 h of Actions logs + AgentsKitOS audit chain to a write-once location. |
| Post in the security channel | on-call | Include token prefix (last 4), suspected source, time of detection, scope. |

---

## 2. Eradicate — first hour

1. **Rotate downstream credentials** that the leaked token could have unlocked: registry tokens, deploy keys, signing keys, OIDC trust policies, vault refs.
2. **Invalidate CI caches** that may have been poisoned (Actions cache, `pnpm` cache, Turborepo remote cache, container registry tags).
3. **Re-pin lockfiles** if any agent run after the leak edited `pnpm-lock.yaml` or `package.json`. Compare against the last known-good `git log` before the suspected window.
4. **Replay the AgentsKit audit chain** for the window: every coding-agent run must reconcile to a worktree id and policy decision; flag rows with missing `policyDecision` or `signature`.
5. **Disable any newly added bot identities or apps** that appear after the suspected window.

---

## 3. Recover — first day

- Restore the affected workflow from a known-good commit; re-enable only after rotated tokens are wired through environment Secrets / Variables.
- Re-run conformance with the rotated keys and verify the gate artifact (`coding-agent-conformance-gate`) is green.
- Confirm that `tools.git.diff` over the suspected window shows no unexpected file edits, especially in `.github/workflows/`, `package.json`, lockfiles, or `docs/security/`.
- Bring the workspace back to its normal `runMode` only after security sign-off.

---

## 4. Communicate

| Audience | Trigger | Channel |
|----------|--------|---------|
| Internal security + engineering leads | Sev 1 declared | Security incident channel + ticket. |
| Customers / data subjects | Confirmed scope ≥ tenant data exposure | Per your DPA / contractual SLA; legal owns wording. |
| Regulators (GDPR, HIPAA, etc.) | Per regulation | Legal owns the clock — escalate at hour 0, not hour 71. |
| Provider vendors | Token confirmed stolen | Anthropic / OpenAI / Google — file an abuse report with the rotated key id. |

Do **not** post raw token prefixes, logs, or stack traces to a public channel.

---

## 5. After the incident

1. **Postmortem** within 5 business days; output a written write-up + action items.
2. **File follow-up issues** in the `area:security` queue for any structural gaps surfaced (missing alerts, missing scopes, missing rotation tooling).
3. **Update this playbook** with anything you discovered: missing detection signals, slow steps, ambiguous ownership.
4. **Tabletop test** the playbook quarterly; rotate the on-call owner.

---

## 6. Reference workflows (least-privilege templates)

These are minimal templates that pair with the threat model. Adapt to your org.

### 6.1 Token-less Actions job (preferred)

```yaml
name: ci-no-token
on: [pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

`permissions: contents: read` — no write scope, even if `GITHUB_TOKEN` is leaked from logs.

### 6.2 Conformance run with secret indirection

```yaml
name: conformance
on: workflow_dispatch
jobs:
  conformance:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      CODING_AGENT_CONFORMANCE_PROVIDERS: ${{ vars.CODING_AGENT_CONFORMANCE_PROVIDERS }}
    steps:
      - uses: actions/checkout@v6
      - name: Materialize secrets file
        run: |
          umask 077
          printf 'ANTHROPIC_API_KEY=%s\n' "$ANTHROPIC_API_KEY" > .secrets.env
      - run: node scripts/check-coding-agent-conformance-gate.mjs
        env:
          CODING_AGENT_CONFORMANCE_SECRETS_FILE: .secrets.env
```

Secrets never appear in `run:` strings; the materialized file is `0600` and never committed.

### 6.3 Release with conformance + audit upload

See `.github/workflows/release.yml` (#440). The conformance gate failure
blocks publish, and `artifacts/conformance/release-gate.log` is uploaded as
the `coding-agent-conformance-gate` workflow artifact for forensic retention.

---

## References

- GitHub: [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- GitHub: [Keeping your GitHub Actions and workflows secure](https://docs.github.com/en/actions/security-guides/keeping-your-actions-up-to-date-with-dependabot)
- AgentsKitOS: [`docs/security/threat-model-external-coding-agents.md`](./threat-model-external-coding-agents.md)
- AgentsKitOS: [`docs/security/ci-least-privilege-coding-agents.md`](./ci-least-privilege-coding-agents.md)
