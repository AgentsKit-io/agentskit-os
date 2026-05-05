import { describe, expect, it } from 'vitest'
import { parseSecurityConfig } from '../../src/schema/security.js'
import {
  evaluateWorkspacePolicyAtRunStart,
  evaluateWorkspacePolicyBeforeTool,
  policyGlobMatch,
} from '../../src/security/workspace-policy-engine.js'

describe('policyGlobMatch', () => {
  it('matches literal', () => {
    expect(policyGlobMatch('anthropic:claude-sonnet-4-6', 'anthropic:claude-sonnet-4-6')).toBe(true)
    expect(policyGlobMatch('anthropic:claude-sonnet-4-6', 'openai:gpt')).toBe(false)
  })

  it('matches star wildcard', () => {
    expect(policyGlobMatch('anthropic:*', 'anthropic:claude-sonnet-4-6')).toBe(true)
    expect(policyGlobMatch('*:claude-*', 'anthropic:claude-sonnet-4-6')).toBe(true)
  })
})

describe('evaluateWorkspacePolicyAtRunStart', () => {
  it('allows default permissive policy', () => {
    const policy = parseSecurityConfig({}).workspacePolicy
    const d = evaluateWorkspacePolicyAtRunStart({
      policy,
      runMode: 'preview',
      modelRef: 'anthropic:claude-sonnet-4-6',
    })
    expect(d.allow).toBe(true)
    expect(d.violations).toHaveLength(0)
  })

  it('blocks denied model', () => {
    const policy = parseSecurityConfig({
      workspacePolicy: { modelsDeny: ['openai:*'] },
    }).workspacePolicy
    const d = evaluateWorkspacePolicyAtRunStart({
      policy,
      runMode: 'real',
      modelRef: 'openai:gpt-4.1',
    })
    expect(d.allow).toBe(false)
    expect(d.violations.some((v) => v.code === 'policy.model_denied')).toBe(true)
  })

  it('enforces allowlist when set', () => {
    const policy = parseSecurityConfig({
      workspacePolicy: { modelsAllow: ['anthropic:*'] },
    }).workspacePolicy
    const ok = evaluateWorkspacePolicyAtRunStart({
      policy,
      runMode: 'real',
      modelRef: 'anthropic:claude-sonnet-4-6',
    })
    const bad = evaluateWorkspacePolicyAtRunStart({
      policy,
      runMode: 'real',
      modelRef: 'openai:gpt-4.1',
    })
    expect(ok.allow).toBe(true)
    expect(bad.allow).toBe(false)
  })

  it('enforces residency when configured', () => {
    const policy = parseSecurityConfig({
      workspacePolicy: { dataResidencyRequired: ['eu-west-1'] },
    }).workspacePolicy
    expect(
      evaluateWorkspacePolicyAtRunStart({
        policy,
        runMode: 'dry_run',
        residencyRegion: 'eu-west-1',
      }).allow,
    ).toBe(true)
    expect(
      evaluateWorkspacePolicyAtRunStart({
        policy,
        runMode: 'dry_run',
        residencyRegion: 'us-east-1',
      }).allow,
    ).toBe(false)
  })
})

describe('evaluateWorkspacePolicyBeforeTool', () => {
  it('blocks denied tools', () => {
    const policy = parseSecurityConfig({
      workspacePolicy: { toolsDeny: ['github.pr.*'] },
    }).workspacePolicy
    const d = evaluateWorkspacePolicyBeforeTool({ policy, toolId: 'github.pr.merge' })
    expect(d.allow).toBe(false)
  })

  it('requires HITL for irreversible tags', () => {
    const policy = parseSecurityConfig({}).workspacePolicy
    const d = evaluateWorkspacePolicyBeforeTool({
      policy,
      toolId: 'payments.charge',
      toolTags: ['destructive'],
    })
    expect(d.allow).toBe(true)
    expect(d.requireHumanApproval).toBe(true)
  })
})
