// ADR-0015 — pure mapping from AgentsKit's MemoryStore shape to
// os-runtime's MemoryAdapter. No serialization, eviction, or scoping —
// upstream concerns. Read returns raw value (or undefined if missing).

import type { MemoryAdapter } from '@agentskit/os-runtime'
import type { RunContext } from '@agentskit/os-core'

export interface AgentskitMemoryStore {
  readonly id?: string
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

export type AgentskitMemoryAdapterOptions = {
  readonly id?: string
  readonly keyResolver?: (ref: string, ctx: RunContext) => string
}

const DEFAULT_ID = 'agentskit-memory'

export const createAgentskitMemoryAdapter = (
  store: AgentskitMemoryStore,
  opts: AgentskitMemoryAdapterOptions = {},
): MemoryAdapter => {
  const id = opts.id ?? store.id ?? DEFAULT_ID
  const resolveKey = opts.keyResolver ?? ((ref) => ref)
  return {
    id,
    read: async (ref, ctx) => store.get(resolveKey(ref, ctx)),
    write: async (ref, value, ctx) => store.set(resolveKey(ref, ctx), value),
  }
}
