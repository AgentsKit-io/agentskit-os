// Cost meter primitive per ADR-0012 cost-meter extension point.
// Pure schema + computation. Pricing tables registered by plugins;
// no live API calls in core.

import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'

export const Currency = z.enum(['USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CNY'])
export type Currency = z.infer<typeof Currency>

export const ModelPricing = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  pinnedVersion: z.string().min(1).max(128).optional(),
  inputPerMillion: z.number().nonnegative().max(1_000_000),
  outputPerMillion: z.number().nonnegative().max(1_000_000),
  cachedInputPerMillion: z.number().nonnegative().max(1_000_000).optional(),
  imagesPerCall: z.number().nonnegative().max(100).optional(),
  audioPerSecond: z.number().nonnegative().max(100).optional(),
  currency: Currency.default('USD'),
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
  effectiveTo: z.string().datetime({ offset: true }).optional(),
  source: z.string().min(1).max(512).optional(),
})
export type ModelPricing = z.infer<typeof ModelPricing>

export const parseModelPricing = (input: unknown): ModelPricing => ModelPricing.parse(input)
export const safeParseModelPricing = (input: unknown) => ModelPricing.safeParse(input)

export type Usage = {
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly cachedInputTokens?: number
  readonly images?: number
  readonly audioSeconds?: number
}

export type CostBreakdown = {
  readonly currency: Currency
  readonly input: number
  readonly output: number
  readonly cachedInput: number
  readonly images: number
  readonly audio: number
  readonly total: number
}

export const computeCost = (usage: Usage, pricing: ModelPricing): CostBreakdown => {
  const inputTokens = usage.inputTokens ?? 0
  const cached = usage.cachedInputTokens ?? 0
  const billableInput = Math.max(0, inputTokens - cached)
  const input = (billableInput / 1_000_000) * pricing.inputPerMillion
  const output = ((usage.outputTokens ?? 0) / 1_000_000) * pricing.outputPerMillion
  const cachedInput =
    pricing.cachedInputPerMillion !== undefined
      ? (cached / 1_000_000) * pricing.cachedInputPerMillion
      : 0
  const images =
    pricing.imagesPerCall !== undefined ? (usage.images ?? 0) * pricing.imagesPerCall : 0
  const audio =
    pricing.audioPerSecond !== undefined
      ? (usage.audioSeconds ?? 0) * pricing.audioPerSecond
      : 0
  const total = input + output + cachedInput + images + audio
  return { currency: pricing.currency, input, output, cachedInput, images, audio, total }
}

export type CostMeterId = string

export type CostKey = {
  readonly provider: string
  readonly model: string
  readonly pinnedVersion?: string
}

const keyOf = (k: CostKey): string =>
  `${k.provider}|${k.model}|${k.pinnedVersion ?? ''}`

export class CostMeter {
  private prices = new Map<string, ModelPricing>()

  register(p: ModelPricing): void {
    const key: CostKey = { provider: p.provider, model: p.model }
    if (p.pinnedVersion !== undefined) (key as { pinnedVersion?: string }).pinnedVersion = p.pinnedVersion
    this.prices.set(keyOf(key), p)
  }

  unregister(k: CostKey): boolean {
    return this.prices.delete(keyOf(k))
  }

  lookup(k: CostKey, at?: Date): ModelPricing | undefined {
    const exact = this.prices.get(keyOf(k))
    if (exact && isInWindow(exact, at)) return exact
    if (k.pinnedVersion !== undefined) {
      const fallback = this.prices.get(keyOf({ provider: k.provider, model: k.model }))
      if (fallback && isInWindow(fallback, at)) return fallback
    }
    return undefined
  }

  meter(k: CostKey, usage: Usage, at?: Date): CostBreakdown | undefined {
    const p = this.lookup(k, at)
    return p ? computeCost(usage, p) : undefined
  }

  get size(): number {
    return this.prices.size
  }
}

const isInWindow = (p: ModelPricing, at: Date | undefined): boolean => {
  if (!at) return true
  const t = at.getTime()
  if (p.effectiveFrom) {
    const from = Date.parse(p.effectiveFrom)
    if (Number.isFinite(from) && t < from) return false
  }
  if (p.effectiveTo) {
    const to = Date.parse(p.effectiveTo)
    if (Number.isFinite(to) && t >= to) return false
  }
  return true
}

export const CostBudgetCheck = z.object({
  workspaceId: Slug,
  spentToday: z.number().nonnegative(),
  spentMonth: z.number().nonnegative(),
  dailyLimit: z.number().nonnegative().optional(),
  monthlyLimit: z.number().nonnegative().optional(),
})
export type CostBudgetCheck = z.infer<typeof CostBudgetCheck>

export type BudgetDecision =
  | { kind: 'within' }
  | {
      kind: 'exceeded'
      scope: 'daily' | 'monthly'
      limit: number
      spent: number
    }

export const checkBudget = (input: CostBudgetCheck, prospectiveCost = 0): BudgetDecision => {
  if (input.dailyLimit !== undefined) {
    const projected = input.spentToday + prospectiveCost
    if (projected > input.dailyLimit) {
      return { kind: 'exceeded', scope: 'daily', limit: input.dailyLimit, spent: projected }
    }
  }
  if (input.monthlyLimit !== undefined) {
    const projected = input.spentMonth + prospectiveCost
    if (projected > input.monthlyLimit) {
      return { kind: 'exceeded', scope: 'monthly', limit: input.monthlyLimit, spent: projected }
    }
  }
  return { kind: 'within' }
}
