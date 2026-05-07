import { describe, expect, it } from 'vitest'
import { parseTriggerConfig } from '@agentskit/os-core'
import {
  createTriggerScheduler,
  defaultComputeNext,
} from '../src/trigger-scheduler.js'

const cron = (id: string, expr: string) =>
  parseTriggerConfig({
    kind: 'cron',
    id,
    name: id,
    enabled: true,
    flow: `${id}-flow`,
    cron: expr,
  }) as Extract<ReturnType<typeof parseTriggerConfig>, { kind: 'cron' }>

describe('defaultComputeNext (Phase A-4)', () => {
  it('every-minute schedule fires after 60s', () => {
    expect(defaultComputeNext(cron('a', '* * * * *'), 0)).toBe(60_000)
  })

  it('STAR/5 schedule fires after 5 minutes', () => {
    expect(defaultComputeNext(cron('b', '*/5 * * * *'), 0)).toBe(5 * 60_000)
  })

  it('falls back to 60s on unknown cron expression', () => {
    expect(defaultComputeNext(cron('c', '0 0 1 1 0'), 0)).toBe(60_000)
  })
})

describe('createTriggerScheduler (Phase A-4)', () => {
  it('dispatches when nextFireAt elapsed and reschedules', () => {
    const dispatched: { id: string; receivedAt: number }[] = []
    const sched = createTriggerScheduler({
      computeNext: () => 1_000,
      dispatch: (t) => dispatched.push({ id: t.id, receivedAt: t.receivedAt }),
    })
    sched.registerCron(cron('every-minute', '* * * * *'))
    expect(sched.tick(500)).toBe(0)
    expect(sched.tick(2_000)).toBe(1)
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]?.id).toBe('every-minute')
  })

  it('reset clears every slot', () => {
    const sched = createTriggerScheduler({
      computeNext: () => 0,
      dispatch: () => undefined,
    })
    sched.registerCron(cron('a', '* * * * *'))
    sched.reset()
    expect(sched.list()).toEqual([])
  })
})
