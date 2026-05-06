// Per #80 — runtime contract for trigger handlers + plugin extension API.
// Pure: defines the shape every trigger backend must implement and the
// registry plugins use to add new trigger kinds. No I/O at module load.

import type { TriggerConfig } from '../schema/trigger.js'

export type TriggerKind = TriggerConfig['kind']

/** Outcome a trigger handler returns when it dispatches a flow run. */
export type TriggerDispatch =
  | { readonly kind: 'dispatched'; readonly runId: string; readonly flow: string; readonly input?: unknown }
  | { readonly kind: 'skipped'; readonly reason: string }
  | { readonly kind: 'failed'; readonly error: { readonly code: string; readonly message: string } }

/** Trigger event shape passed from source (webhook payload, cron tick, file event, etc.). */
export type TriggerEvent<TPayload = unknown> = {
  readonly triggerId: string
  readonly receivedAt: number
  readonly payload: TPayload
}

/** Contract every trigger backend must implement (#80). */
export type TriggerContract<TConfig extends TriggerConfig = TriggerConfig, TPayload = unknown> = {
  readonly kind: TConfig['kind']
  readonly displayName: string
  /** Validate the config is consistent with this trigger kind; returns reasons[] when not. */
  readonly validate: (config: TConfig) => readonly string[]
  /** Dispatch the trigger event into the flow runtime. */
  readonly dispatch: (config: TConfig, event: TriggerEvent<TPayload>) => Promise<TriggerDispatch>
}

export type TriggerRegistration =
  | { readonly kind: 'registered'; readonly triggerKind: TriggerKind }
  | { readonly kind: 'conflict'; readonly triggerKind: TriggerKind; readonly existingDisplayName: string }

export type TriggerRegistry = {
  readonly register: (contract: TriggerContract) => TriggerRegistration
  readonly unregister: (kind: TriggerKind) => boolean
  readonly get: (kind: TriggerKind) => TriggerContract | undefined
  readonly list: () => readonly TriggerContract[]
  readonly dispatch: (config: TriggerConfig, event: TriggerEvent) => Promise<TriggerDispatch>
}

/**
 * Build an in-memory trigger registry (#80). Plugins call `register` to add
 * a new trigger kind; the host calls `dispatch` whenever an upstream event
 * fires. Pure: no timers, no network — caller wires those at the
 * provider boundary.
 */
export const createTriggerRegistry = (): TriggerRegistry => {
  const handlers = new Map<TriggerKind, TriggerContract>()

  return {
    register: (contract) => {
      const existing = handlers.get(contract.kind)
      if (existing !== undefined) {
        return {
          kind: 'conflict',
          triggerKind: contract.kind,
          existingDisplayName: existing.displayName,
        }
      }
      handlers.set(contract.kind, contract)
      return { kind: 'registered', triggerKind: contract.kind }
    },
    unregister: (kind) => handlers.delete(kind),
    get: (kind) => handlers.get(kind),
    list: () => [...handlers.values()],
    dispatch: async (config, event) => {
      const contract = handlers.get(config.kind)
      if (contract === undefined) {
        return {
          kind: 'failed',
          error: {
            code: 'trigger.kind_not_registered',
            message: `no trigger contract registered for kind="${config.kind}"`,
          },
        }
      }
      const issues = contract.validate(config as never)
      if (issues.length > 0) {
        return {
          kind: 'failed',
          error: {
            code: 'trigger.config_invalid',
            message: issues.join('; '),
          },
        }
      }
      return contract.dispatch(config as never, event)
    },
  }
}
