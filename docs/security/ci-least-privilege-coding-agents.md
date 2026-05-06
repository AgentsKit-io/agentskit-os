# CI least privilege for external coding agents (#379)

This playbook supports [threat-model-external-coding-agents.md](./threat-model-external-coding-agents.md) §4.7–4.8 (CI abuse, stolen tokens). It is **not** legal advice; adapt to your org’s security program.

## Goals

- **No long-lived PATs in fork PR workflows** unless you explicitly trust the branch source.
- **Scoped credentials**: use machine users or OIDC + cloud secret managers where possible; avoid org-admin tokens for “green CI”.
- **Conformance as policy**: only claim providers you certify in CI (see `CODING_AGENT_CONFORMANCE_PROVIDERS` + `coding-agent conformance`).

## GitHub Actions defaults

1. **Pull requests from forks**  
   - Do **not** pass marketplace or third-party secrets to jobs that run unreviewed code.  
   - Use `pull_request_target` only when you understand the blast radius; prefer `pull_request` + explicit `workflow_dispatch` for conformance that needs secrets.

2. **Repository / environment variables**  
   - Put **provider API keys** in GitHub **Secrets** (encrypted) or an external vault; reference them via `env:` indirection, not inline in `run:` strings.  
   - For the AgentsKit conformance gate, use **Variables** for non-secret lists (`CODING_AGENT_CONFORMANCE_PROVIDERS`) and **Secrets** (or a vault file generated in a prior step) for key material. Optional `CODING_AGENT_CONFORMANCE_SECRETS_FILE` should point to a path on the runner produced from a secret (e.g. `echo "$KEY" > .secrets.env` in a prior step with `umask 077`).

3. **Branch protection**  
   - Require reviews for workflows that install CLIs or touch `package.json` / lockfile from bots.

## AgentsKitOS-specific

- Store keys with **`agentskit-os creds`** (see `creds guide`); reference them from YAML as `${vault:key}` where supported.  
- `@agentskit/os-coding-agents` exposes **`parseSecretsEnvFileLines`** / **`loadSecretsEnvFromFile`** for tooling that must merge a `KEY=value` vault file into a subprocess environment without pulling in the full CLI (#375). Keep such files **0600** and **gitignored**.

## Incident response (stolen PAT)

1. Revoke the token at the issuer (GitHub / OpenAI / Anthropic / Google).  
2. Rotate any downstream secrets that accepted that token.  
3. Invalidate CI caches if the token could have poisoned them.  
4. Review audit logs for unexpected `workflow_dispatch` or new environment protections disabled.

## References

- GitHub: [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)  
- OpenAI / Anthropic / Google: use **project-scoped** or **short-lived** keys for automation.
