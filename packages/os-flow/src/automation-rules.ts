// Per #238 — declarative automation rules: when X event, run Y flow.
// Pure: schema + matcher. Caller wires upstream events; the matcher emits
// one dispatch per matched rule for the runtime to enqueue.

import { z } from 'zod'

export const AutomationEventMatcher = z.object({
  /** Event source kind, e.g. 'trigger.cron', 'flow.completed', 'hitl.decided'. */
  source: z.string().min(1).max(128),
  /** Optional event sub-kind (e.g. trigger kind, flow id, decision verdict). */
  kind: z.string().min(1).max(128).optional(),
  /** Equality filters on top-level payload fields. */
  where: z.record(z.string().min(1).max(128), z.union([z.string(), z.number(), z.boolean()])).default({}),
})
export type AutomationEventMatcher = z.infer<typeof AutomationEventMatcher>

export const AutomationAction = z.object({
  /** Flow id to run. */
  flow: z.string().min(1).max(128),
  /** Optional input transform applied to the event before dispatch. */
  inputTemplate: z.record(z.string().min(1).max(128), z.unknown()).optional(),
})
export type AutomationAction = z.infer<typeof AutomationAction>

export const AutomationRule = z.object({
  id: z.string().min(1).max(128),
  description: z.string().max(512).default(''),
  enabled: z.boolean().default(true),
  when: AutomationEventMatcher,
  run: AutomationAction,
  /** Cooldown window in ms; rule cannot fire twice within this window. */
  cooldownMs: z.number().int().min(0).max(86_400_000).default(0),
})
export type AutomationRule = z.infer<typeof AutomationRule>

export const AutomationRuleSet = z.object({
  rules: z.array(AutomationRule).max(256),
})
export type AutomationRuleSet = z.infer<typeof AutomationRuleSet>

export type AutomationEvent = {
  readonly source: string
  readonly kind?: string
  readonly receivedAt: number
  readonly payload: Record<string, unknown>
}

export type AutomationDispatch = {
  readonly ruleId: string
  readonly flow: string
  readonly input: unknown
  readonly firedAt: number
}

const matchesWhere = (
  where: Record<string, string | number | boolean>,
  payload: Record<string, unknown>,
): boolean => {
  for (const [k, v] of Object.entries(where)) {
    if (payload[k] !== v) return false
  }
  return true
}

const matchesRule = (
  rule: AutomationRule,
  event: AutomationEvent,
  lastFiredAt: number | undefined,
): boolean => {
  if (!rule.enabled) return false
  if (rule.when.source !== event.source) return false
  if (rule.when.kind !== undefined && rule.when.kind !== event.kind) return false
  if (!matchesWhere(rule.when.where, event.payload)) return false
  if (rule.cooldownMs > 0 && lastFiredAt !== undefined && event.receivedAt - lastFiredAt < rule.cooldownMs) {
    return false
  }
  return true
}

const renderInput = (
  template: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
): unknown => {
  if (template === undefined) return payload
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(template)) {
    if (typeof v === 'string' && v.startsWith('$.')) {
      out[k] = payload[v.slice(2)]
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * Match an event against a rule set and return one dispatch per fired rule (#238).
 * Caller maintains the cooldown ledger via `lastFiredAt` keyed by rule id.
 */
export const matchAutomationRules = (
  ruleSet: AutomationRuleSet,
  event: AutomationEvent,
  lastFiredAt: ReadonlyMap<string, number> = new Map(),
): readonly AutomationDispatch[] => {
  const dispatches: AutomationDispatch[] = []
  for (const rule of ruleSet.rules) {
    if (!matchesRule(rule, event, lastFiredAt.get(rule.id))) continue
    dispatches.push({
      ruleId: rule.id,
      flow: rule.run.flow,
      input: renderInput(rule.run.inputTemplate, event.payload),
      firedAt: event.receivedAt,
    })
  }
  return dispatches
}

export const parseAutomationRuleSet = (input: unknown): AutomationRuleSet =>
  AutomationRuleSet.parse(input)
export const safeParseAutomationRuleSet = (input: unknown) =>
  AutomationRuleSet.safeParse(input)
