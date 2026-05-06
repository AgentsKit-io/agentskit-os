// Per #105 — security bundle helper.
// Composes prompt firewall (#443/#200) + redaction profile (#439) + sandbox
// pick (#190) so callers wire the three controls in one shot.

import type { PromptFirewallConfig } from '../schema/security.js'
import {
  evaluatePromptFirewallTiered,
  type PromptFirewallTier,
  type PromptFirewallVerdict,
} from './prompt-firewall.js'
import {
  applyRedactionProfile,
  getRedactionProfile,
  type RedactionProfileId,
} from './redaction-profiles.js'
import type {
  SandboxBackend,
  SandboxCapability,
  SandboxRegistry,
} from './sandbox-backends.js'

export type SecurityBundle = {
  /** Run the firewall + redaction pipeline against a prompt. */
  readonly screenPrompt: (prompt: string) => {
    readonly firewall: PromptFirewallVerdict
    readonly redacted: string
  }
  readonly sandbox: SandboxBackend | undefined
  readonly redactionProfileId: RedactionProfileId
  readonly firewallTier: PromptFirewallTier
}

export type SecurityBundleOpts = {
  readonly firewall: PromptFirewallConfig
  readonly firewallTier: PromptFirewallTier
  readonly redactionProfileId: RedactionProfileId
  readonly sandboxRegistry: SandboxRegistry
  readonly sandboxRequired: readonly SandboxCapability[]
}

/**
 * Compose firewall + redaction + sandbox in one call (#105). Returns a
 * single object the runtime queries for both prompt screening and the
 * sandbox backend it should launch tools under. Pure: every dependency is
 * caller-supplied; no side effects at construction.
 */
export const createSecurityBundle = (opts: SecurityBundleOpts): SecurityBundle => {
  const profile = getRedactionProfile(opts.redactionProfileId)
  const sandbox = opts.sandboxRegistry.pick(opts.sandboxRequired)

  return {
    sandbox,
    redactionProfileId: opts.redactionProfileId,
    firewallTier: opts.firewallTier,
    screenPrompt: (prompt) => {
      const firewall = evaluatePromptFirewallTiered(prompt, opts.firewall, opts.firewallTier)
      const redacted = applyRedactionProfile(prompt, profile)
      return { firewall, redacted }
    },
  }
}
