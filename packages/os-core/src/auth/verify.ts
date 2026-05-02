// Pure capability verification. Given AuthContext + requested action + resource,
// decide allow/deny without any signature crypto (signature checks live in higher
// security package — this layer is structural only).

import type { Capability, AuthContext } from './capability.js'

export type VerifyDecision =
  | { kind: 'allow'; capability: Capability }
  | { kind: 'deny'; reason: string }

const matchesResource = (capResource: string, requested: string): boolean => {
  if (capResource === requested) return true
  if (!capResource.includes('*')) return false
  // Wildcard suffix glob: "flow:*" matches "flow:pr-review", "flow:pr-review:node:n1"
  // Algorithm: split on ':' and compare segment-by-segment, '*' matches any single segment
  // and a final ':*' matches all remaining segments.
  const capSeg = capResource.split(':')
  const reqSeg = requested.split(':')
  for (let i = 0; i < capSeg.length; i++) {
    const c = capSeg[i]
    if (c === '*') {
      if (i === capSeg.length - 1) return true // trailing * absorbs the rest
      if (reqSeg[i] === undefined) return false
      continue
    }
    if (reqSeg[i] !== c) return false
  }
  return capSeg.length === reqSeg.length
}

const isExpired = (capability: Capability, now: Date): boolean => {
  const exp = capability.constraints?.expiresAt
  if (!exp) return false
  const t = Date.parse(exp)
  return Number.isFinite(t) && now.getTime() >= t
}

export const verifyCapability = (
  ctx: AuthContext,
  action: string,
  resource: string,
  now: Date = new Date(),
): VerifyDecision => {
  const matches: Capability[] = []
  for (const cap of ctx.capabilities) {
    if (!cap.actions.includes(action as Capability['actions'][number])) continue
    if (!matchesResource(cap.resource, resource)) continue
    matches.push(cap)
  }

  if (matches.length === 0) {
    return { kind: 'deny', reason: `no capability grants action="${action}" on resource="${resource}"` }
  }

  for (const cap of matches) {
    if (isExpired(cap, now)) continue
    return { kind: 'allow', capability: cap }
  }

  return { kind: 'deny', reason: 'all matching capabilities are expired' }
}
