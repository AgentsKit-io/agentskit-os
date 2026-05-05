// ADR-0015 — pure mapping from AgentsKit's MemoryStore shape to
// os-runtime's MemoryAdapter. No serialization, eviction, or scoping —
// upstream concerns. Read returns raw value (or undefined if missing).

import type { MemoryAdapter } from '@agentskit/os-runtime'
import type { RunContext } from '@agentskit/os-core'

export interface AgentskitMemoryStore {
  readonly id: string | undefined
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

export type AgentskitMemoryAdapterOptions = {
  readonly id: string | undefined
  readonly keyResolver: ((ref: string, ctx: RunContext) => string) | undefined
}

const DEFAULT_ID = 'agentskit-memory'

export const createAgentskitMemoryAdapter = (
  store: AgentskitMemoryStore,
  opts: AgentskitMemoryAdapterOptions | undefined = undefined,
): MemoryAdapter => {
  const optId = opts ? opts.id : undefined
  const storeId = store.id
  let id = DEFAULT_ID
  if (storeId !== undefined) id = storeId
  if (optId !== undefined) id = optId

  let resolveKey: (ref: string, ctx: RunContext) => string = (ref) => ref
  if (opts && opts.keyResolver) resolveKey = opts.keyResolver
  return {
    id,
    read: async (ref, ctx) => store.get(resolveKey(ref, ctx)),
    write: async (ref, value, ctx) => store.set(resolveKey(ref, ctx), value),
  }
}
