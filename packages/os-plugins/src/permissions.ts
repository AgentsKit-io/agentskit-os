// Permission grant computation per RFC-0001 + ADR-0006.
// Pure decision logic. Compares plugin requests against user grant policy.

import type {
  CapabilityConstraints,
  PluginConfig,
  PluginPermission,
} from '@agentskit/os-core'

export type GrantStatus = 'auto-grant' | 'prompt-user' | 'deny'

export type PermissionDecision = {
  readonly status: GrantStatus
  readonly permission: PluginPermission
  readonly reason: string
}

export type GrantPolicy = {
  readonly autoGrantPrefixes?: readonly string[]
  readonly denyPrefixes?: readonly string[]
  readonly requireUserPromptForVault?: boolean
}

const matchesPrefix = (resource: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => resource === p || resource.startsWith(`${p}:`))

export const decidePermission = (
  permission: PluginPermission,
  policy: GrantPolicy = {},
): PermissionDecision => {
  const r = permission.resource
  if (policy.denyPrefixes && matchesPrefix(r, policy.denyPrefixes)) {
    return { status: 'deny', permission, reason: `resource "${r}" matches deny policy` }
  }
  if (r.startsWith('vault:') && policy.requireUserPromptForVault !== false) {
    return { status: 'prompt-user', permission, reason: 'vault access requires explicit user grant' }
  }
  if (policy.autoGrantPrefixes && matchesPrefix(r, policy.autoGrantPrefixes)) {
    return { status: 'auto-grant', permission, reason: `auto-granted via policy prefix` }
  }
  return { status: 'prompt-user', permission, reason: 'default policy: prompt user' }
}

export type ManifestEvaluation = {
  readonly autoGranted: readonly PermissionDecision[]
  readonly toPrompt: readonly PermissionDecision[]
  readonly denied: readonly PermissionDecision[]
  readonly required: readonly PluginPermission[]
  readonly optional: readonly PluginPermission[]
}

export const evaluateManifestPermissions = (
  manifest: PluginConfig,
  policy: GrantPolicy = {},
): ManifestEvaluation => {
  const decisions = manifest.permissions.map((p) => decidePermission(p, policy))
  return {
    autoGranted: decisions.filter((d) => d.status === 'auto-grant'),
    toPrompt: decisions.filter((d) => d.status === 'prompt-user'),
    denied: decisions.filter((d) => d.status === 'deny'),
    required: manifest.permissions.filter((p) => p.required !== false),
    optional: manifest.permissions.filter((p) => p.required === false),
  }
}

export const tightenConstraints = (
  requested: CapabilityConstraints | undefined,
  granted: CapabilityConstraints | undefined,
): CapabilityConstraints | undefined => {
  if (!requested) return granted
  if (!granted) return requested
  const out: CapabilityConstraints = {}
  if (requested.rateLimit && granted.rateLimit) {
    out.rateLimit = {
      perMin: Math.min(requested.rateLimit.perMin, granted.rateLimit.perMin),
    }
  } else if (requested.rateLimit) {
    out.rateLimit = requested.rateLimit
  } else if (granted.rateLimit) {
    out.rateLimit = granted.rateLimit
  }
  if (requested.budget || granted.budget) {
    const usd = [requested.budget?.usd, granted.budget?.usd].filter((v): v is number => v !== undefined)
    const tokens = [requested.budget?.tokens, granted.budget?.tokens].filter(
      (v): v is number => v !== undefined,
    )
    out.budget = {}
    if (usd.length > 0) out.budget.usd = Math.min(...usd)
    if (tokens.length > 0) out.budget.tokens = Math.min(...tokens)
  }
  if (requested.expiresAt && granted.expiresAt) {
    out.expiresAt =
      Date.parse(requested.expiresAt) < Date.parse(granted.expiresAt)
        ? requested.expiresAt
        : granted.expiresAt
  } else {
    const single = requested.expiresAt ?? granted.expiresAt
    if (single !== undefined) out.expiresAt = single
  }
  if (requested.argsSchema || granted.argsSchema) {
    out.argsSchema = requested.argsSchema ?? granted.argsSchema
  }
  return out
}
