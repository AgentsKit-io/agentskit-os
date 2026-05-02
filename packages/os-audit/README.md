# @agentskit/os-audit

Audit emitter that builds tamper-evident Merkle batch chains from event streams (ADR-0008).

## Status

Pre-1.0 alpha.

## Usage

```ts
import { AuditEmitter, InMemoryBatchStore } from '@agentskit/os-audit'

const emitter = new AuditEmitter({
  store: new InMemoryBatchStore(),
  signer: mySigner,                  // ed25519 signer
  newBatchId: () => randomUlid(),
  maxEventsPerBatch: 1000,
  maxIntervalMs: 60_000,
})

bus.subscribe('*', (event) => emitter.ingest(event))
// ...
await emitter.close()                // flushes pending + freezes
```

## Verification

Built-in `verifyChain` from `@agentskit/os-core` validates:
- prev-hash continuity
- merkle root recomputation
- digest match
- signature (via injected verifier)

## License

MIT
