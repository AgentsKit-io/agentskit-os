// App-level egress enforcer for ADR-0011.
//
// Wraps `globalThis.fetch` (or any host-provided fetch) so every outbound
// request is decided by `checkEgress(policy, ...)` from os-core before any
// socket is opened. Default-deny applies when policy.mode === 'deny' and the
// allowlist doesn't match.
//
// This is the lowest-cost enforcement layer per ADR-0011 §4: works in
// `none` and `process` sandboxes. Stronger isolation (network namespace +
// iptables for `container`+) plugs in via the same `EgressEnforcer`
// interface and ships in M6 with `os-security`.

import {
  type EgressDecision,
  type EgressGrant,
  type EgressPolicy,
  checkEgress,
} from '@agentskit/os-core'

export type EgressDecisionEvent =
  | { kind: 'allowed'; pluginId?: string; grant: EgressGrant; url: string; method: string }
  | { kind: 'denied'; pluginId?: string; reason: string; url: string; method: string }

export interface EgressEnforcer {
  /** Decide whether an outbound URL is permitted. */
  decide(url: string, opts?: { method?: string; pluginId?: string }): EgressDecision
}

const requestFromUrl = (
  rawUrl: string,
  method: string | undefined,
): { request: string; host: string } => {
  const u = new URL(rawUrl)
  const host = u.hostname
  const port = u.port
  const path = u.pathname && u.pathname !== '/' ? u.pathname.slice(1) : undefined

  // map HTTP-style methods → fetch op; raw TCP would use `connect`.
  const op = method && /^(get|post|put|patch|delete|head|options)$/i.test(method) ? 'fetch' : 'fetch'
  const portPart = port ? `:${port}` : ''
  const pathPart = path ? `/${path}` : ''
  return { request: `net:${op}:${host}${portPart}${pathPart}`, host }
}

/**
 * App-level enforcer backed by an `EgressPolicy` and `checkEgress` from
 * os-core. Hosts that need network-namespace enforcement implement
 * `EgressEnforcer` themselves and pass it to whoever wraps the fetch.
 */
export class PolicyEgressEnforcer implements EgressEnforcer {
  constructor(private readonly policy: EgressPolicy) {}

  decide(url: string, opts?: { method?: string; pluginId?: string }): EgressDecision {
    const { request } = requestFromUrl(url, opts?.method)
    return checkEgress(this.policy, request, opts?.pluginId)
  }
}

export interface CreateFetchGuardOptions {
  readonly enforcer: EgressEnforcer
  /** Fetch implementation to wrap. Defaults to `globalThis.fetch`. */
  readonly fetch?: typeof fetch
  /** Identifier for plugin-scoped overrides in `EgressPolicy.pluginOverrides`. */
  readonly pluginId?: string
  /** Decision callback for audit emitters (`net.fetch.allowed/denied`). */
  readonly onDecision?: (event: EgressDecisionEvent) => void
}

/**
 * Returns a `fetch`-shaped function that consults the enforcer before
 * dispatching. Denied requests throw a `TypeError` shaped like a network
 * failure so callers cannot distinguish real DNS failures from policy
 * blocks (ADR-0011 §6 audit covers attribution).
 */
export const createFetchGuard = (
  opts: CreateFetchGuardOptions,
): typeof fetch => {
  const realFetch = opts.fetch ?? globalThis.fetch
  if (typeof realFetch !== 'function') {
    throw new Error('createFetchGuard: no fetch implementation available')
  }
  const guarded: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const decision = opts.enforcer.decide(url, { method, ...(opts.pluginId !== undefined ? { pluginId: opts.pluginId } : {}) })

    if (decision.kind === 'deny') {
      const event: EgressDecisionEvent = {
        kind: 'denied',
        reason: decision.reason,
        url,
        method,
      }
      if (opts.pluginId !== undefined) event.pluginId = opts.pluginId
      opts.onDecision?.(event)
      throw new TypeError(`egress denied: ${decision.reason}`)
    }

    const event: EgressDecisionEvent = {
      kind: 'allowed',
      grant: decision.grant,
      url,
      method,
    }
    if (opts.pluginId !== undefined) event.pluginId = opts.pluginId
    opts.onDecision?.(event)
    return realFetch(input, init)
  }
  return guarded
}
