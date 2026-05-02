# ADR-0011 — Egress Default-Deny + Allowlist

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Most agent compromises = data exfiltration via attacker-controlled domain (prompt injection → "send to evil.com"). Default-allow networking is the foot-gun. Hospitals + finance forbid uncontrolled egress. RFC-0001 already proposed `net:fetch:<host>` capability — this ADR specifies enforcement.

## Decision

### 1. Default deny

Agent / tool / plugin processes have **no network access** unless capability granted (ADR-0006).

### 2. Capability grammar

```
net:fetch:<host>[:<port>][/<path-prefix>]
net:connect:<host>:<port>          # raw TCP
net:dns:<zone>                     # DNS lookups (often forgotten)
```

Host = exact hostname or wildcard subdomain (`*.github.com`). No bare wildcards. `net:fetch:*` rejected at parse — opt-in only via explicit `net:fetch:any` (audited, never default).

### 3. Per-workspace policy

```yaml
security:
  egress:
    mode: 'deny' | 'allow'        # default: deny
    allowlist:
      - net:fetch:api.openai.com
      - net:fetch:*.anthropic.com
      - net:fetch:hooks.slack.com/services/*
    plugin_overrides:
      github-pr-bot:
        - net:fetch:api.github.com
    proxy:
      url: 'http://corp-proxy:3128'    # optional outbound proxy
      mtlsCert: '${vault:proxy_cert}'
    blocklist:                         # always denied even if granted
      - net:fetch:metadata.google.internal
      - net:connect:169.254.169.254:*  # cloud metadata services
      - net:fetch:localhost
      - net:fetch:127.0.0.1
      - net:fetch:::1
      - net:fetch:10.*
      - net:fetch:172.16.*
      - net:fetch:192.168.*
```

Blocklist always wins. Cloud metadata + RFC1918 ranges blocked by default to prevent SSRF pivots.

### 4. Enforcement layer

Three options, plug-in via `EgressEnforcer` interface:

| Layer | Where | Pros | Cons |
|---|---|---|---|
| App-level fetch wrapper | inside agent process | trivial | bypassable via raw socket |
| OS-level seccomp / pledge | sandbox runtime (ADR-0010 `process` level) | strong | platform-specific |
| Network namespace + iptables / nftables | sandbox runtime (`container` level) | strongest | needs container |

Default: app-level for `none`/`process` sandboxes; network-namespace for `container`+. Built-in firewall plugin ships with both.

### 5. Domain resolution

Capabilities check against **resolved IP** post-DNS, not just hostname (DNS rebinding defense). Resolver logs every lookup → audit topic `system.audit.dns.*`.

### 6. Egress audit

Every allowed request → `net.fetch.allowed` event with `principalId`, host, bytes, latency, status. Every denied → `net.fetch.denied`. Cost guard subscribes (data-egress fees).

### 7. UI

Desktop shows live network panel: list of egress destinations per agent run. Marketplace plugin listing surfaces `egress: ['api.github.com', 'raw.githubusercontent.com']` so users know before install.

### 8. Air-gap mode (ADR-coming)

`mode: airgap` flips default to **all denied**, no override possible. Only `localhost` permitted, only for self-hosted services. Validates ingress too.

## Consequences

- Major posture upgrade — prompt-injection exfil becomes hard.
- Configuration burden — mitigated by sane defaults + plugin-declared egress (auto-allowlist on install grant).
- Some integrations (search, scrapers) need wide allowlists — explicit, visible, audited.
- Adds DNS interception layer — minor latency.

## Alternatives Considered

- **Default-allow with denylist.** Rejected. Attackers find unblocked hosts; well-known anti-pattern.
- **Browser-style CORS.** Rejected. Wrong layer; agents not HTTP-only.
- **Trust-on-first-use prompt.** Rejected. Agents run unattended.

## Open Questions

- mTLS-out for enterprise — schema + cert rotation.
- WebSocket / SSE long-lived connections — count against rate? Per-message inspection?
- HTTP/3 + QUIC — does namespace approach still work?
