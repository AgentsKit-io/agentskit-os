// Reference SpanExporter — collects finished spans in-process for tests
// and ad-hoc inspection. Real backends (OTel, LangSmith) live in
// companion packages.

import type { Span, SpanExporter } from './trace-collector.js'

export class InMemorySpanExporter implements SpanExporter {
  private readonly spans: Span[] = []

  export(span: Span): void {
    this.spans.push(span)
  }

  all(): readonly Span[] {
    return this.spans.slice()
  }

  forTrace(traceId: string): readonly Span[] {
    return this.spans.filter((s) => s.traceId === traceId)
  }

  reset(): void {
    this.spans.length = 0
  }

  get size(): number {
    return this.spans.length
  }
}
