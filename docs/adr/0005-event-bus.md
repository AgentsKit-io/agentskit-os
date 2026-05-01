# ADR-0005 — Event Bus Contract

- **Status:** Proposed
- **Date:** 2026-05-01
- **Deciders:** @EmersonBraun

## Context

ADR-0001 names an event bus as core scope but does not specify the wire shape. Multiple subsystems already need it: hot-reload (`config:changed` in ADR-0003), trigger → flow dispatch (M4), trace stream (M2 dashboard), HITL signals (M3), plugin lifecycle (M5), and cloud-sync replication (M8). Without a single envelope all of these will diverge — exact failure mode killed Flowise/Langflow ecosystems (ADR-0001).

Defining the bus late is breaking. Define now, even though the first concrete consumer (M2) is weeks away.

## Decision

### 1. Single envelope, CloudEvents v1.0 compatible

```ts
Event<TType extends string, TData> {
  specversion: '1.0'              // CloudEvents
  id: string                      // ULID, monotonic
  type: TType                     // 'agentskitos.<domain>.<action>'
  source: string                  // URI: 'agentskitos://workspace/<id>/<subsystem>'
  subject?: string                // entity ref, e.g. 'flow/<runId>/node/<id>'
  time: string                    // ISO 8601
  datacontenttype: 'application/json'
  dataschema: string              // versioned schema URI
  data: TData                     // typed payload, Zod-validated
  // OS extensions
  workspaceId: string
  principalId: string             // see ADR-0006
  traceId: string                 // W3C trace context
  spanId: string
  causationId?: string            // event that caused this one
  correlationId?: string          // user-flow grouping
}
```

### 2. Topic taxonomy (reserved roots)

`config.*` · `agent.*` · `flow.*` · `trigger.*` · `plugin.*` · `vault.*` · `trace.*` · `hitl.*` · `cost.*` · `system.*`

Plugins must namespace under `plugin.<plugin-id>.*`. Reserved roots rejected at publish.

### 3. Delivery semantics

| Channel | Guarantee | Use |
|---|---|---|
| In-process | sync, at-most-once | UI subscribers, hot-reload |
| Durable (sqlite WAL) | at-least-once, ordered per `subject` | flow checkpoints, trigger dispatch, audit |
| Cross-device (cloud) | at-least-once, CRDT merge | M8 |

Idempotency required: consumers dedupe on `id`. `causationId` enables replay graph reconstruction (time-travel debug, M6).

### 4. Schema registry

Each `type` maps to a Zod schema in `@agentskit/os-core/src/events/`. Versioned via `dataschema` URI (`agentskitos://schema/flow.run.started/v1`). Breaking change = new version + RFC.

### 5. Backpressure + DLQ

Bounded per-subscriber queue (default 1k). Overflow → drop-oldest + emit `system.subscriber.lagging`. Durable channel: failed handler after N retries → dead-letter topic `<root>.dlq` with original event + error envelope (ADR-0007 error model).

### 6. Security

- `principalId` mandatory; bus rejects unsigned events from plugins (ADR-0006 capability check).
- PII redaction hook runs before persistence (M6 owner).
- Audit topic `system.audit.*` is append-only, signed batches.

## Consequences

- All subsystems consume one shape. Trace viewer, replay, time-travel = generic over envelope.
- CloudEvents alignment → free interop with external brokers (NATS, Kafka, Knative) when self-host scales.
- Plugin authors get one mental model.
- Schema registry adds CI step (validate `dataschema` URI exists).
- Forces ADR-0006 (principal) and ADR-0007 (error envelope) before M1 freeze.

## Alternatives Considered

- **Custom envelope.** Rejected. CloudEvents is industry default; no upside in NIH.
- **Per-subsystem ad-hoc shapes.** Rejected. Drift is the failure mode this project explicitly avoids.
- **Kafka/NATS required from day 1.** Rejected. Violates self-host-day-1 + <15 MB installer. Sqlite WAL meets durability for single-host; cloud broker is opt-in via adapter.
- **EventEmitter only.** Rejected. No durability, no replay, no audit.
