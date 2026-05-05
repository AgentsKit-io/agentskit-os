// Shared shapes for run observability (#199 / ADR-0005).

export type FlowCostTickEvent = {
  readonly kind: 'cost.tick'
  readonly totalUsd: number
  readonly deltaUsd: number
  readonly cumulativeInputTokens: number
  readonly cumulativeOutputTokens: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly nodeId?: string
  readonly system: string
  readonly model: string
}
