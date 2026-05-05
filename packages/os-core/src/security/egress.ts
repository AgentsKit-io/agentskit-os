// Egress policy per ADR-0011. Pure decision logic + zod schema.
// Default deny. Allowlist + blocklist + plugin overrides. SSRF-safe.

import { z } from 'zod'
import { VaultSecretRef } from '../schema/_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

const EgressGrant = z
  .string()
  .min(5)
  .max(512)
  .regex(/^net:(fetch|connect|dns):[^\s]+$/, {
    message: 'must be net:<fetch|connect|dns>:<host>[:port][/path]',
  })
export type EgressGrant = z.infer<typeof EgressGrant>

export const EgressProxy = z.object({
  url: z.string().url(),
  mtlsCert: SecretOrPlain.optional(),
})
export type EgressProxy = z.infer<typeof EgressProxy>

const DEFAULT_BLOCKLIST: readonly string[] = [
  'net:fetch:metadata.google.internal',
  'net:connect:169.254.169.254:*',
  'net:fetch:169.254.169.254',
  'net:fetch:localhost',
  'net:fetch:127.0.0.1',
  'net:fetch:::1',
  'net:fetch:0.0.0.0',
]

export const EgressPolicy = z
  .object({
    mode: z.enum(['deny', 'allow']).default('deny'),
    allowlist: z.array(EgressGrant).max(2048).default([]),
    pluginOverrides: z.record(z.string().min(1).max(64), z.array(EgressGrant).max(256)).default({}),
    proxy: EgressProxy.optional(),
    blocklist: z.array(EgressGrant).max(2048).default([...DEFAULT_BLOCKLIST]),
  })
  .superRefine((p, ctx) => {
    for (const g of p.allowlist) {
      if (g === 'net:fetch:*') {
        ctx.addIssue({
          code: 'custom',
          path: ['allowlist'],
          message: 'bare wildcard "net:fetch:*" rejected; use explicit "net:fetch:any" for opt-in',
        })
        return
      }
    }
  })
export type EgressPolicy = z.infer<typeof EgressPolicy>

export const parseEgressPolicy = (input: unknown): EgressPolicy => EgressPolicy.parse(input)
export const safeParseEgressPolicy = (input: unknown) => EgressPolicy.safeParse(input)

export type EgressDecision =
  | { kind: 'allow'; grant: EgressGrant }
  | { kind: 'deny'; reason: string }

type ParsedGrant = {
  op: 'fetch' | 'connect' | 'dns'
  host: string
  port: string | undefined
  path: string | undefined
}

const parseGrant = (g: string): ParsedGrant | null => {
  const m = /^net:(fetch|connect|dns):([^/:]+)(:([^/]+)){0,1}(\/(.*)){0,1}$/.exec(g)
  if (!m) return null
  return { op: m[1] as 'fetch' | 'connect' | 'dns', host: m[2]!, port: m[4], path: m[6] }
}

const matchHost = (pattern: string, host: string): boolean => {
  if (pattern === host) return true
  if (pattern === 'any') return true
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1)
    return host.endsWith(suffix) && host.length > suffix.length
  }
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -1)
    return host.startsWith(prefix)
  }
  return false
}

const matchPort = (pattern: string | undefined, port: string | undefined): boolean => {
  if (pattern === undefined) return true
  if (pattern === '*') return true
  return pattern === port
}

const matchPath = (pattern: string | undefined, path: string | undefined): boolean => {
  if (pattern === undefined) return true
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    const actual = path !== undefined ? path : ''
    return actual.startsWith(prefix)
  }
  return pattern === path
}

const matchGrant = (pattern: string, requested: string): boolean => {
  const p = parseGrant(pattern)
  const r = parseGrant(requested)
  if (!p || !r) return false
  if (p.op !== r.op) return false
  if (!matchHost(p.host, r.host)) return false
  if (!matchPort(p.port, r.port)) return false
  if (!matchPath(p.path, r.path)) return false
  return true
}

export const checkEgress = (
  policy: EgressPolicy,
  requested: string,
  pluginId?: string,
): EgressDecision => {
  if (!parseGrant(requested)) {
    return { kind: 'deny', reason: `malformed egress request "${requested}"` }
  }

  for (const blocked of policy.blocklist) {
    if (matchGrant(blocked, requested)) {
      return { kind: 'deny', reason: `blocked by policy: ${blocked}` }
    }
  }

  if (policy.mode === 'allow') {
    return { kind: 'allow', grant: requested as EgressGrant }
  }

  let overrides: readonly EgressGrant[] = []
  if (pluginId) {
    const raw = policy.pluginOverrides[pluginId]
    if (raw !== undefined) overrides = raw
  }
  for (const allowed of [...policy.allowlist, ...overrides]) {
    if (matchGrant(allowed, requested)) {
      return { kind: 'allow', grant: allowed }
    }
  }

  return { kind: 'deny', reason: `no allowlist entry matches "${requested}"` }
}
