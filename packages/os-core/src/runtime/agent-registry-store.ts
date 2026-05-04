// Per ROADMAP M2 (#335 follow-up). Pure registry store contract.
// Concrete sqlite + jsonl mirror lives in os-storage; this module only
// declares the interface and a transition reducer that consumers apply
// to their persisted state.

import { z } from 'zod'
import { AgentRegistryEntry, AgentLifecycleState } from '../schema/agent-registry.js'
import { AgentLifecycleEvent } from './agent-lifecycle.js'

export type RegistryStore = {
  /** Get an entry by id, or undefined when absent. */
  readonly get: (agentId: string) => Promise<AgentRegistryEntry | undefined>
  /** List all entries. Order is implementation-defined. */
  readonly list: () => Promise<readonly AgentRegistryEntry[]>
  /** Upsert an entry. Returns the persisted entry. */
  readonly upsert: (entry: AgentRegistryEntry) => Promise<AgentRegistryEntry>
  /** Append a lifecycle event. Idempotent: callers must guard against retries. */
  readonly appendEvent: (event: AgentLifecycleEvent) => Promise<void>
  /** Read all events for an agent ordered by timestamp ascending. */
  readonly readEvents: (agentId: string) => Promise<readonly AgentLifecycleEvent[]>
}

/**
 * Apply a lifecycle transition event to an entry. Pure.
 * Consumers call this after persisting the event; the reducer keeps
 * the registry's current state in sync with the event log.
 */
export const applyLifecycleEvent = (
  entry: AgentRegistryEntry,
  event: AgentLifecycleEvent,
): AgentRegistryEntry => {
  if (entry.agentId !== event.agentId) return entry
  if (entry.lifecycleState !== event.from) return entry
  return {
    ...entry,
    lifecycleState: event.to,
    audit: {
      ...(entry.audit ?? {}),
      lastReviewedAt: event.at,
      lastReviewedBy: event.actor,
      ...(event.reason ? { notes: event.reason } : {}),
    },
  }
}

/**
 * Replay the full event log over the initial entry to produce the
 * current state. Useful for rebuilding after a sqlite corruption or
 * for verifying the jsonl mirror against sqlite.
 */
export const replayEvents = (
  initial: AgentRegistryEntry,
  events: readonly AgentLifecycleEvent[],
): AgentRegistryEntry => events.reduce((acc, e) => applyLifecycleEvent(acc, e), initial)

export const RegistryWriteResult = z.object({
  entry: AgentRegistryEntry,
  event: AgentLifecycleEvent,
  /** True when the writer authoritatively committed to sqlite (or canonical store). */
  committed: z.boolean(),
})
export type RegistryWriteResult = z.infer<typeof RegistryWriteResult>

/**
 * Map an entry's lifecycle state to a display-only "stage" label used in
 * dashboards. Avoids hard-coding the enum across UI consumers.
 */
export const stageLabel = (state: AgentLifecycleState): string => {
  const labels: Record<AgentLifecycleState, string> = {
    draft: 'Draft',
    review: 'In Review',
    approved: 'Approved',
    staged: 'Staged',
    production: 'Production',
    deprecated: 'Deprecated',
    retired: 'Retired',
  }
  return labels[state]
}
