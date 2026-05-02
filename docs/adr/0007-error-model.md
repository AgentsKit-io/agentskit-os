# ADR-0007 — Structured Error Model

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

Event bus (ADR-0005) DLQ entries, capability denials (ADR-0006), config validation failures (ADR-0003), plugin sandbox violations, flow node failures, vault errors, trigger dispatch errors all need a single error envelope. Without one, every consumer reinvents shape and UI/CLI/desktop diverge in messaging.

Goals:

- Machine-routable (typed code).
- Human-readable (message + hint).
- Stable across packages and SemVer majors.
- Cause-chained for time-travel debug.
- Safe to log (no secret leak).

## Decision

### 1. Envelope

```ts
OsError {
  name: 'OsError'
  code: ErrorCode             // typed, namespaced
  message: string             // short, end-user safe
  hint?: string               // remediation
  retryable: boolean
  category: 'user' | 'config' | 'auth' | 'plugin' | 'runtime' | 'integration' | 'internal'
  source: string              // 'agentskitos://workspace/<id>/<subsystem>' (matches Event.source)
  principalId?: string        // ADR-0006
  workspaceId?: string
  traceId?: string
  spanId?: string
  causationId?: string        // event id that triggered this
  cause?: OsError | { name: string; message: string; stack?: string }
  details?: Record<string, unknown>  // domain payload, redacted
  occurredAt: string          // ISO 8601
  schemaVersion: 1
}
```

### 2. Code grammar

`<domain>.<reason>` lowercase dot-separated. Reserved domains mirror event taxonomy: `config`, `auth`, `vault`, `flow`, `trigger`, `plugin`, `agent`, `tool`, `event`, `net`, `fs`, `cost`, `system`.

Examples: `config.schema_invalid`, `auth.cap_denied`, `vault.key_not_found`, `flow.node_timeout`, `plugin.signature_invalid`, `cost.budget_exceeded`.

Codes versioned: removal/rename = RFC + major bump. Additions = minor.

### 3. Class hierarchy

Single `OsError` class extends `Error`. Subclassing discouraged — discriminate on `code`. Type narrowing via discriminated union on code prefix when needed.

### 4. Redaction

`details` passes through redaction pipeline before persistence/transport: known secret keys (`*_key`, `*_token`, `password`, `authorization`) replaced with `[REDACTED]`. Vault refs preserved (`${vault:...}` is not the secret).

### 5. Cause chain

Wrapping preserves cause. `OsError.wrap(cause, { code, message })` standard helper. Chain depth capped (8) to prevent runaway logs.

### 6. Bus integration (ADR-0005)

DLQ events carry `OsError` in `data.error`. UI trace viewer renders cause chain natively. Audit topic logs only `code` + `category` + `principalId` + `traceId` (no details) for compliance projections.

### 7. CLI / Desktop rendering

Shared formatter pkg `@agentskit/os-core/errors`: `format(err, { format: 'tty' | 'json' | 'gui' })`. Same code → same UX everywhere.

## Consequences

- One error envelope across CLI, desktop, plugins, cloud.
- Codes catalog file (`errors/codes.ts`) becomes contract — RFC-gated.
- Plugins emit only registered codes or namespaced under `plugin.<id>.*`.
- Trace viewer + DLQ + audit log share rendering.

## Alternatives Considered

- **Plain `Error` + ad-hoc fields.** Rejected. Drift inevitable.
- **HTTP-status-style numeric codes.** Rejected. Too coarse, not domain-aware.
- **gRPC status codes.** Rejected. Wire-format-coupled, doesn't fit in-process bus.
- **Multiple Error subclasses.** Rejected. instanceof breaks across package boundaries (dual-package hazard).
