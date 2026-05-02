import { describe, expect, it } from 'vitest'
import {
  decidePermission,
  evaluateManifestPermissions,
  tightenConstraints,
} from '../src/permissions.js'
import type { PluginConfig, PluginPermission } from '@agentskit/os-core'

const perm = (over: Partial<PluginPermission>): PluginPermission =>
  ({
    resource: 'tool:web-search',
    actions: ['invoke'],
    reason: 'test',
    required: true,
    ...over,
  }) as PluginPermission

describe('decidePermission', () => {
  it('vault resources prompt user by default', () => {
    const d = decidePermission(perm({ resource: 'vault:openai_key' }))
    expect(d.status).toBe('prompt-user')
    expect(d.reason).toContain('vault')
  })

  it('vault prompt can be disabled via policy', () => {
    const d = decidePermission(perm({ resource: 'vault:openai_key' }), {
      requireUserPromptForVault: false,
    })
    expect(d.status).toBe('prompt-user')
  })

  it('auto-grants matching prefix', () => {
    const d = decidePermission(perm({ resource: 'tool:web-search' }), {
      autoGrantPrefixes: ['tool'],
    })
    expect(d.status).toBe('auto-grant')
  })

  it('denies matching deny-prefix even if also in auto-grant', () => {
    const d = decidePermission(perm({ resource: 'net:fetch:evil.com' }), {
      autoGrantPrefixes: ['net'],
      denyPrefixes: ['net:fetch:evil.com'],
    })
    expect(d.status).toBe('deny')
  })

  it('default policy prompts user', () => {
    const d = decidePermission(perm({ resource: 'flow:run' }))
    expect(d.status).toBe('prompt-user')
  })
})

describe('evaluateManifestPermissions', () => {
  const manifest: PluginConfig = {
    id: 'web-search',
    name: 'Web Search',
    version: '1.0.0',
    source: 'npm:@agentskit/tool-web-search',
    contributes: ['tool'],
    enabled: true,
    tags: [],
    permissions: [
      perm({ resource: 'tool:web-search' }),
      perm({ resource: 'vault:api_key' }),
      perm({ resource: 'net:fetch:evil.com' }),
      perm({ resource: 'tool:non-essential', required: false }),
    ],
  } as PluginConfig

  it('partitions decisions by status', () => {
    const e = evaluateManifestPermissions(manifest, {
      autoGrantPrefixes: ['tool'],
      denyPrefixes: ['net:fetch:evil.com'],
    })
    expect(e.autoGranted.length).toBe(2)
    expect(e.toPrompt.length).toBe(1)
    expect(e.denied.length).toBe(1)
  })

  it('reports required vs optional', () => {
    const e = evaluateManifestPermissions(manifest)
    expect(e.required.length).toBe(3)
    expect(e.optional.length).toBe(1)
  })
})

describe('tightenConstraints', () => {
  it('returns granted when requested undefined', () => {
    const c = tightenConstraints(undefined, { rateLimit: { perMin: 10 } })
    expect(c).toEqual({ rateLimit: { perMin: 10 } })
  })

  it('returns requested when granted undefined', () => {
    const c = tightenConstraints({ rateLimit: { perMin: 10 } }, undefined)
    expect(c).toEqual({ rateLimit: { perMin: 10 } })
  })

  it('takes lower of rateLimit perMin', () => {
    const c = tightenConstraints({ rateLimit: { perMin: 100 } }, { rateLimit: { perMin: 30 } })
    expect(c?.rateLimit?.perMin).toBe(30)
  })

  it('takes lower of usd budget', () => {
    const c = tightenConstraints({ budget: { usd: 5 } }, { budget: { usd: 1 } })
    expect(c?.budget?.usd).toBe(1)
  })

  it('takes earlier expiresAt', () => {
    const c = tightenConstraints(
      { expiresAt: '2030-01-01T00:00:00.000Z' },
      { expiresAt: '2026-01-01T00:00:00.000Z' },
    )
    expect(c?.expiresAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('preserves single-side budget', () => {
    const c = tightenConstraints({ budget: { tokens: 1000 } }, undefined)
    expect(c?.budget?.tokens).toBe(1000)
  })
})
