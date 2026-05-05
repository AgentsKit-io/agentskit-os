// Per #336 — declarative workspace policy evaluation (pure; no I/O).

import type { RunMode } from '../runtime/run-mode.js'
import type { WorkspacePolicyConfig } from '../schema/security.js'

export type PolicyViolation = {
  readonly code: string
  readonly message: string
}

export type WorkspacePolicyDecision = {
  readonly allow: boolean
  /** When true, runtime should enqueue HITL before proceeding (#336, #337). */
  readonly requireHumanApproval: boolean
  readonly violations: readonly PolicyViolation[]
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Minimal glob: only `*` wildcards, case-insensitive match on full string. */
export const policyGlobMatch = (pattern: string, value: string): boolean => {
  const p = pattern.trim().toLowerCase()
  const v = value.trim().toLowerCase()
  if (!p.includes('*')) return v === p || v.includes(p)
  const re = new RegExp(`^${p.split('*').map(escapeRe).join('.*')}$`, 'i')
  return re.test(v)
}

const anyMatch = (patterns: readonly string[], value: string): boolean =>
  patterns.some((pat) => policyGlobMatch(pat, value))

export type RunStartPolicyInput = {
  readonly policy: WorkspacePolicyConfig
  readonly runMode: RunMode
  /** e.g. `anthropic:claude-sonnet-4-6` — optional when unknown */
  readonly modelRef?: string
  readonly residencyRegion?: string
  readonly activeDomainPresets?: readonly string[]
}

/**
 * Evaluate org policy before a flow/agent run starts (#336).
 */
export const evaluateWorkspacePolicyAtRunStart = (input: RunStartPolicyInput): WorkspacePolicyDecision => {
  const violations: PolicyViolation[] = []
  const { policy } = input

  if (!policy.runModesAllowed.includes(input.runMode)) {
    violations.push({
      code: 'policy.run_mode_blocked',
      message: `run mode "${input.runMode}" is not allowed by workspace policy`,
    })
  }

  if (input.modelRef !== undefined && input.modelRef.length > 0) {
    if (policy.modelsDeny.length > 0 && anyMatch(policy.modelsDeny, input.modelRef)) {
      violations.push({
        code: 'policy.model_denied',
        message: `model "${input.modelRef}" matches deny list`,
      })
    }
    if (
      policy.modelsAllow.length > 0 &&
      !policy.modelsAllow.some((pat) => policyGlobMatch(pat, input.modelRef!))
    ) {
      violations.push({
        code: 'policy.model_not_allowlisted',
        message: `model "${input.modelRef}" is not covered by modelsAllow`,
      })
    }
  }

  if (policy.dataResidencyRequired.length > 0) {
    const region = input.residencyRegion?.trim() ?? ''
    if (!region || !policy.dataResidencyRequired.includes(region)) {
      violations.push({
        code: 'policy.residency_mismatch',
        message: `data residency requires one of: ${policy.dataResidencyRequired.join(', ')}`,
      })
    }
  }

  if (policy.domainPresetsRequired.length > 0) {
    const active = new Set(input.activeDomainPresets ?? [])
    const missing = policy.domainPresetsRequired.filter((id) => !active.has(id))
    if (missing.length > 0) {
      violations.push({
        code: 'policy.domain_preset_missing',
        message: `missing required domain preset(s): ${missing.join(', ')}`,
      })
    }
  }

  return {
    allow: violations.length === 0,
    requireHumanApproval: false,
    violations,
  }
}

export type ToolPolicyInput = {
  readonly policy: WorkspacePolicyConfig
  readonly toolId: string
  readonly toolTags?: readonly string[]
}

/**
 * Evaluate before a sensitive tool executes (#336).
 */
export const evaluateWorkspacePolicyBeforeTool = (input: ToolPolicyInput): WorkspacePolicyDecision => {
  const violations: PolicyViolation[] = []
  const { policy } = input

  if (policy.toolsDeny.length > 0 && anyMatch(policy.toolsDeny, input.toolId)) {
    violations.push({
      code: 'policy.tool_denied',
      message: `tool "${input.toolId}" is denied by policy`,
    })
  }

  const tags = input.toolTags ?? []
  const hitl =
    tags.length > 0 &&
    policy.irreversibleToolTags.some((tag) => tags.some((t) => policyGlobMatch(tag, t) || t === tag))

  return {
    allow: violations.length === 0,
    requireHumanApproval: hitl && violations.length === 0,
    violations,
  }
}
