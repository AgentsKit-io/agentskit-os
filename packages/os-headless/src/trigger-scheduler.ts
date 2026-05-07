// Phase A-4 — generic trigger scheduler primitive.
// Pure-ish: caller supplies clock + nextFireMs computer. The scheduler
// tracks per-trigger next-fire times and emits dispatch decisions when
// polled. Pairs with the existing webhook server (HTTP-driven triggers)
// and the file-watch wrapper below.

import type { CronTrigger, FileWatchTrigger } from '@agentskit/os-core'

export type ScheduledTrigger = {
  readonly id: string
  readonly kind: 'cron' | 'file' | 'interval'
  readonly nextFireAt: number
}

export type SchedulerComputeNext = (
  trigger: CronTrigger | FileWatchTrigger,
  fromMs: number,
) => number

export type SchedulerDispatch = (
  trigger: { id: string; flow: string; receivedAt: number; payload: unknown },
) => void

export type TriggerScheduler = {
  readonly registerCron: (trigger: CronTrigger) => void
  readonly reset: () => void
  readonly list: () => readonly ScheduledTrigger[]
  /** Tick the scheduler: dispatch every trigger whose nextFireAt <= now. Returns dispatch count. */
  readonly tick: (now: number) => number
}

export type TriggerSchedulerOpts = {
  readonly computeNext: SchedulerComputeNext
  readonly dispatch: SchedulerDispatch
}

type Slot = {
  id: string
  kind: ScheduledTrigger['kind']
  flow: string
  trigger: CronTrigger | FileWatchTrigger
  nextFireAt: number
}

export const createTriggerScheduler = (opts: TriggerSchedulerOpts): TriggerScheduler => {
  const slots = new Map<string, Slot>()

  return {
    registerCron: (trigger) => {
      const nextFireAt = opts.computeNext(trigger, Date.now())
      slots.set(trigger.id, {
        id: trigger.id,
        kind: 'cron',
        flow: trigger.flow,
        trigger,
        nextFireAt,
      })
    },
    reset: () => slots.clear(),
    list: () =>
      [...slots.values()]
        .map((s) => ({ id: s.id, kind: s.kind, nextFireAt: s.nextFireAt }))
        .sort((a, b) => a.nextFireAt - b.nextFireAt),
    tick: (now) => {
      let dispatched = 0
      for (const slot of slots.values()) {
        if (slot.nextFireAt > now) continue
        opts.dispatch({
          id: slot.id,
          flow: slot.flow,
          receivedAt: now,
          payload: { fired: 'scheduled', kind: slot.kind },
        })
        slot.nextFireAt = opts.computeNext(slot.trigger, now)
        dispatched += 1
      }
      return dispatched
    },
  }
}

/**
 * Default cron-fire computer. Handles simple shapes; production deployments
 * should swap in `cron-parser` for full RFC support.
 *
 * - `* * * * *` → fires once per minute
 * - `STAR/N * * * *` (N minutes) → every N minutes
 * - anything else → 60s fallback
 */
export const defaultComputeNext: SchedulerComputeNext = (trigger, fromMs) => {
  if ('cron' in trigger) {
    const cronExpr = trigger.cron.trim()
    if (cronExpr === '* * * * *') return fromMs + 60_000
    const stepMatch = /^\*\/(\d+) \* \* \* \*$/.exec(cronExpr)
    if (stepMatch !== null) {
      const minutes = Number(stepMatch[1])
      if (minutes > 0 && minutes <= 60) return fromMs + minutes * 60_000
    }
  }
  return fromMs + 60_000
}
