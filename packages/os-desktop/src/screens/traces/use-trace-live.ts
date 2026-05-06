/**
 * Live cost + run state for the trace detail header (#199).
 * Subscribes to sidecar `cost.tick` / `trace.*` / `flow.run.cancelled`.
 */

import { useCallback, useEffect, useState } from 'react'
import { cancelRunForTrace, subscribeEvents, type SidecarEvent } from '../../lib/sidecar'

export type TraceLiveCostState = {
  readonly totalUsd: number
  readonly inputTokens: number
  readonly outputTokens: number
  /** True after `trace.started` until `trace.completed` or `flow.run.cancelled` for this trace. */
  readonly runActive: boolean
}

const readTraceId = (data: Record<string, unknown>): string | undefined =>
  typeof data.traceId === 'string' ? data.traceId : undefined

export function useTraceLiveSession(traceId: string | null): TraceLiveCostState & {
  readonly cancelRun: () => Promise<void>
} {
  const [cost, setCost] = useState({ totalUsd: 0, inputTokens: 0, outputTokens: 0 })
  const [runActive, setRunActive] = useState(false)

  useEffect(() => {
    if (traceId === null) {
      setRunActive(false)
      setCost({ totalUsd: 0, inputTokens: 0, outputTokens: 0 })
      return
    }

    setCost({ totalUsd: 0, inputTokens: 0, outputTokens: 0 })
    setRunActive(false)

    const onEvent = (event: SidecarEvent): void => {
      const id = readTraceId(event.data)
      if (id !== traceId) return

      if (event.type === 'trace.started') {
        setRunActive(true)
        setCost({ totalUsd: 0, inputTokens: 0, outputTokens: 0 })
        return
      }

      if (event.type === 'trace.completed' || event.type === 'flow.run.cancelled') {
        setRunActive(false)
        return
      }

      if (event.type === 'cost.tick') {
        const d = event.data
        const totalUsd = typeof d['totalUsd'] === 'number' ? d['totalUsd'] : 0
        const inputTok =
          typeof d['cumulativeInputTokens'] === 'number' ? d['cumulativeInputTokens'] : 0
        const outputTok =
          typeof d['cumulativeOutputTokens'] === 'number' ? d['cumulativeOutputTokens'] : 0
        setCost({ totalUsd, inputTokens: inputTok, outputTokens: outputTok })
      }
    }

    const unsub = subscribeEvents(onEvent)
    return unsub
  }, [traceId])

  const cancelRun = useCallback(async () => {
    if (traceId === null) return
    await cancelRunForTrace(traceId)
  }, [traceId])

  return { ...cost, runActive, cancelRun }
}
