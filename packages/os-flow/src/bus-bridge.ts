// Flow event → EventBus bridge. Converts node:start / node:end /
// node:resumed events into OsEvent envelopes (ADR-0005) and publishes
// onto a provided EventBus. Pure mapping; no I/O beyond bus.publish.

import type { AnyEvent, EventBus, RunContext } from '@agentskit/os-core'
import type { NodeOutcome } from './handlers.js'
import type { FlowCostTickEvent } from './flow-observability-events.js'

export type BridgeOptions = {
  readonly bus: EventBus
  readonly ctx: RunContext
  /** Override event source URI. Defaults to `agentskitos://flow/<runId>`. */
  readonly source?: string
  /** Override event id generator. Defaults to ULID-style monotonic. */
  readonly newEventId?: () => string
  /** Override clock. Defaults to `() => new Date().toISOString()`. */
  readonly now?: () => string
}

const ULID_BASE = '01HXYZTPGGJTZ3WBPJN3XKXQ'
let counter = 0
const defaultUlid = (): string => {
  counter = (counter + 1) % 36 ** 2
  return `${ULID_BASE}${counter.toString(36).toUpperCase().padStart(2, '0').slice(-2)}`
}

const outcomeToType = (outcome: NodeOutcome): string => {
  switch (outcome.kind) {
    case 'ok':
      return 'flow.node.completed'
    case 'failed':
      return 'flow.node.failed'
    case 'paused':
      return 'flow.node.paused'
    case 'skipped':
      return 'flow.node.skipped'
  }
}

const buildEnvelope = (
  type: string,
  data: Record<string, unknown>,
  opts: BridgeOptions,
): AnyEvent => {
  const now = opts.now ?? (() => new Date().toISOString())
  const newId = opts.newEventId ?? defaultUlid
  return {
    specversion: '1.0',
    id: newId(),
    type,
    source: opts.source ?? `agentskitos://flow/${opts.ctx.runId}`,
    time: now(),
    datacontenttype: 'application/json',
    dataschema: `agentskitos://schema/${type.replace(/\./g, '_')}/v1`,
    data,
    workspaceId: opts.ctx.workspaceId,
    principalId: 'system_runtime',
    traceId: opts.ctx.runId,
    spanId: (data.nodeId as string) ?? opts.ctx.runId,
  } as AnyEvent
}

export type BridgeEvent =
  | { kind: 'node:start'; nodeId: string }
  | { kind: 'node:end'; nodeId: string; outcome: NodeOutcome }
  | { kind: 'node:resumed'; nodeId: string; outcome: NodeOutcome }
  /** #199 — emitted when the runner is cancelled via AbortSignal. */
  | { kind: 'run:cancelled'; reason: string }
  /** #199 / ADR-0005 — live LLM cost + token totals after each metered invoke. */
  | FlowCostTickEvent

export const createBusOnEvent = (opts: BridgeOptions) => {
  return async (event: BridgeEvent): Promise<void> => {
    const runMode = opts.ctx.runMode
    if (event.kind === 'cost.tick') {
      const data: Record<string, unknown> = {
        runMode,
        totalUsd: event.totalUsd,
        deltaUsd: event.deltaUsd,
        cumulativeInputTokens: event.cumulativeInputTokens,
        cumulativeOutputTokens: event.cumulativeOutputTokens,
        system: event.system,
        model: event.model,
      }
      if (event.inputTokens !== undefined) data.inputTokens = event.inputTokens
      if (event.outputTokens !== undefined) data.outputTokens = event.outputTokens
      if (event.nodeId !== undefined) data.nodeId = event.nodeId
      await opts.bus.publish(buildEnvelope('cost.tick', data, opts))
      return
    }
    if (event.kind === 'run:cancelled') {
      await opts.bus.publish(
        buildEnvelope('flow.run.cancelled', { reason: event.reason, runMode }, opts),
      )
      return
    }
    if (event.kind === 'node:start') {
      await opts.bus.publish(
        buildEnvelope('flow.node.started', { nodeId: event.nodeId, runMode }, opts),
      )
      return
    }
    if (event.kind === 'node:resumed') {
      await opts.bus.publish(
        buildEnvelope(
          'flow.node.resumed',
          { nodeId: event.nodeId, outcomeKind: event.outcome.kind, runMode },
          opts,
        ),
      )
      return
    }
    const type = outcomeToType(event.outcome)
    const baseData: Record<string, unknown> = {
      nodeId: event.nodeId,
      outcomeKind: event.outcome.kind,
      runMode,
    }
    if (event.outcome.kind === 'ok') {
      // value may be unserializable; defensive stringify
      try {
        JSON.stringify(event.outcome.value)
        baseData.value = event.outcome.value
      } catch {
        baseData.value = '[unserializable]'
      }
    } else if (event.outcome.kind === 'failed') {
      baseData.errorCode = event.outcome.error.code
      baseData.errorMessage = event.outcome.error.message
    } else if (event.outcome.kind === 'paused') {
      baseData.pauseReason = event.outcome.reason
    } else if (event.outcome.kind === 'skipped') {
      baseData.skipReason = event.outcome.reason
    }
    await opts.bus.publish(buildEnvelope(type, baseData, opts))
  }
}

export const FLOW_EVENT_TYPES = [
  'flow.node.started',
  'flow.node.completed',
  'flow.node.failed',
  'flow.node.paused',
  'flow.node.skipped',
  'flow.node.resumed',
  'flow.run.cancelled',
  'cost.tick',
] as const
export type FlowEventType = (typeof FLOW_EVENT_TYPES)[number]
