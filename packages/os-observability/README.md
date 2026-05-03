# @agentskit/os-observability

> Pure decision logic converting AgentsKitOS events into structured logs / traces / metrics. Pluggable sinks.

**Distribution:** `public` · **Stability:** `alpha`

Per [ADR-0016](../../docs/adr/0016-observability-package.md).

## Install

```bash
pnpm add @agentskit/os-observability @agentskit/os-core zod
```

## Quick start

```ts
import { InMemoryEventBus } from '@agentskit/os-core'
import { createLogSink, consoleLogWriter } from '@agentskit/os-observability'

const bus = new InMemoryEventBus()
bus.subscribe('*', createLogSink({ writer: consoleLogWriter() }))
```

## Roadmap

- ✅ `createLogSink` + `consoleLogWriter`
- ✅ `replayEvents`
- ⏳ `createTraceCollector` + `inMemorySpanExporter`
- ⏳ `createMetricsRegistry` + `inMemoryMetricSink`
- ⏳ companion: `@agentskit/os-observability-otel`
