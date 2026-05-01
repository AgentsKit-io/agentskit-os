# Security Policy

## Supported Versions

Pre-1.0: only the latest minor receives security fixes.
Post-1.0: latest two minors of the current major.

## Reporting a Vulnerability

**Do not open public GitHub issues for security reports.**

Email: `security@agentskit.dev` (placeholder until domain setup) with:
- Description of the vulnerability.
- Steps to reproduce.
- Affected versions.
- Suggested mitigation if known.

You will receive an acknowledgement within **72 hours**.

## Disclosure Timeline

- Day 0: report received, ack within 72h.
- Day 1–14: triage + reproduce + classify severity (CVSS).
- Day 14–60: develop + test + release fix.
- Day 60: coordinated public disclosure with credit to reporter.

Critical vulnerabilities (RCE, secret exfil, sandbox escape) follow accelerated 7–14 day timeline.

## Threat Model (high-level)

AgentsKitOS executes user-authored agents and third-party plugins. Threats:

- **Prompt injection** → executes unintended tools / exfils data. Mitigated by prompt firewall + scoped tool permissions.
- **PII leakage** → mitigated by PII redaction layer + audit log.
- **Sandbox escape** → mitigated by E2B/WebContainer mandatory sandbox for code-exec tools.
- **Supply chain (plugins)** → mitigated by signed plugins, marketplace audit, capability declarations.
- **Secret exposure** → mitigated by OS-level encrypted vault, biometric unlock, no secrets in config files.
- **Audit tampering** → mitigated by signed audit log.

## Scope

In scope: all `@agentskit/os-*` packages, desktop app, cloud sync.
Out of scope: third-party plugins (report directly to plugin author), AgentsKit upstream (report to AgentsKit security).

## Hall of Fame

Reporters credited here after disclosure (with consent).
