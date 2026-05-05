/**
 * Activation + retention metrics for agent workspaces.
 *
 * Strict opt-in: all activation events flow through the existing telemetry
 * consent gate (`decideEmit`) before they are emitted. Air-gap mode
 * (`consent.state === 'disabled' | 'unset'`) drops every event.
 *
 * No prompts, secrets, code contents, PHI, or PII are captured. Each event
 * carries only stable categorical fields (ids, kinds) and bucketed timings.
 */

import { z } from 'zod'
import { TelemetryConsent, decideEmit } from './telemetry.js'

export const ActivationEventKind = z.enum([
  'workspace.created',
  'workspace.first_agent_created',
  'workspace.first_run_succeeded',
  'workspace.first_provider_connected',
  'workspace.first_pr_generated',
  'workspace.repeat_run',
])
export type ActivationEventKind = z.infer<typeof ActivationEventKind>

export const ActivationEvent = z.object({
  kind: ActivationEventKind,
  at: z.string().datetime(),
  installId: z.string().uuid(),
  workspaceIdHash: z.string().regex(/^[0-9a-f]{16,64}$/, {
    message: 'workspaceIdHash must be a hex digest, never the raw workspace id',
  }),
  /** Stable provider category (`anthropic`, `openai`, etc.) — never API keys. */
  providerCategory: z.string().min(1).max(64).optional(),
  /** For repeat-run cohort analysis: 1 = first run on the day, 7 = 7th, etc. */
  ordinal: z.number().int().min(1).max(10_000).optional(),
})
export type ActivationEvent = z.infer<typeof ActivationEvent>

export const RetentionCohort = z.object({
  /** ISO date (YYYY-MM-DD) the cohort first activated. */
  cohortDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Distinct installIds that activated in the cohort. */
  size: z.number().int().nonnegative(),
  /** Map of week-offset → distinct installIds still active that week. */
  retentionByWeek: z.record(z.string().regex(/^w[0-9]{1,2}$/), z.number().int().nonnegative()),
})
export type RetentionCohort = z.infer<typeof RetentionCohort>

const ACTIVATION_FUNNEL_ORDER: readonly ActivationEventKind[] = [
  'workspace.created',
  'workspace.first_agent_created',
  'workspace.first_provider_connected',
  'workspace.first_run_succeeded',
  'workspace.first_pr_generated',
]

export type ActivationFunnel = ReadonlyArray<{
  readonly stage: ActivationEventKind
  readonly installs: number
}>

export const decideEmitActivation = (consent: TelemetryConsent): 'emit' | 'drop' =>
  decideEmit(consent)

/**
 * Compute an activation funnel from a list of events. The result preserves
 * the canonical funnel ordering and reports the count of distinct installIds
 * that hit each stage.
 */
export const buildActivationFunnel = (
  events: readonly ActivationEvent[],
): ActivationFunnel => {
  const reachedByStage = new Map<ActivationEventKind, Set<string>>()
  for (const stage of ACTIVATION_FUNNEL_ORDER) {
    reachedByStage.set(stage, new Set())
  }
  for (const event of events) {
    const bucket = reachedByStage.get(event.kind)
    if (bucket) bucket.add(event.installId)
  }
  return ACTIVATION_FUNNEL_ORDER.map((stage) => ({
    stage,
    installs: reachedByStage.get(stage)?.size ?? 0,
  }))
}

const isoDate = (iso: string): string => iso.slice(0, 10)

const weekOffset = (cohortDate: string, eventIso: string): number => {
  const cohortMs = Date.parse(`${cohortDate}T00:00:00Z`)
  const eventMs = Date.parse(eventIso)
  if (Number.isNaN(cohortMs) || Number.isNaN(eventMs)) return -1
  const diffDays = Math.floor((eventMs - cohortMs) / (24 * 60 * 60 * 1000))
  return Math.floor(diffDays / 7)
}

export type RetentionInputs = {
  readonly activations: readonly ActivationEvent[]
  readonly repeatRuns: readonly ActivationEvent[]
  readonly horizonWeeks: number
}

/**
 * Build per-cohort retention from activation + repeat-run events. Cohort key
 * is the ISO date of the install's `workspace.created` event. An install
 * counts as retained in week N if it has at least one `workspace.repeat_run`
 * whose timestamp falls in week N relative to the cohort date.
 */
export const buildRetentionCohorts = ({
  activations,
  repeatRuns,
  horizonWeeks,
}: RetentionInputs): readonly RetentionCohort[] => {
  const horizon = Math.max(0, Math.min(horizonWeeks, 26))
  const cohortByInstall = new Map<string, string>()
  for (const event of activations) {
    if (event.kind !== 'workspace.created') continue
    const date = isoDate(event.at)
    if (!cohortByInstall.has(event.installId)) cohortByInstall.set(event.installId, date)
  }

  const cohortInstalls = new Map<string, Set<string>>()
  for (const [installId, cohortDate] of cohortByInstall) {
    const bucket = cohortInstalls.get(cohortDate) ?? new Set<string>()
    bucket.add(installId)
    cohortInstalls.set(cohortDate, bucket)
  }

  const retentionByCohort = new Map<string, Map<number, Set<string>>>()
  for (const event of repeatRuns) {
    if (event.kind !== 'workspace.repeat_run') continue
    const cohortDate = cohortByInstall.get(event.installId)
    if (!cohortDate) continue
    const offset = weekOffset(cohortDate, event.at)
    if (offset < 0 || offset > horizon) continue
    const cohortMap = retentionByCohort.get(cohortDate) ?? new Map<number, Set<string>>()
    const weekBucket = cohortMap.get(offset) ?? new Set<string>()
    weekBucket.add(event.installId)
    cohortMap.set(offset, weekBucket)
    retentionByCohort.set(cohortDate, cohortMap)
  }

  const cohorts: RetentionCohort[] = []
  for (const [cohortDate, installs] of cohortInstalls) {
    const retentionByWeek: Record<string, number> = {}
    for (let week = 0; week <= horizon; week += 1) {
      const reached = retentionByCohort.get(cohortDate)?.get(week)?.size ?? 0
      retentionByWeek[`w${week}`] = reached
    }
    cohorts.push({ cohortDate, size: installs.size, retentionByWeek })
  }
  cohorts.sort((a, b) => a.cohortDate.localeCompare(b.cohortDate))
  return cohorts
}

export const parseActivationEvent = (input: unknown): ActivationEvent =>
  ActivationEvent.parse(input)
