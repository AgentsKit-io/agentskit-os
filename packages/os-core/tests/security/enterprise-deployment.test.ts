import { describe, expect, it } from 'vitest'
import {
  CloudSyncConfig,
  EnterpriseDeployment,
  verifyEnterpriseDeployment,
} from '../../src/index.js'

const cloud = (over: Partial<typeof CloudSyncConfig._zod.def['out']> = {}) =>
  CloudSyncConfig.parse({
    enabled: true,
    plan: 'enterprise',
    endpoint: 'https://cloud.agentskit.io',
    ...over,
  })

describe('verifyEnterpriseDeployment (#124)', () => {
  it('passes for cloud-shared config', () => {
    const r = verifyEnterpriseDeployment(
      EnterpriseDeployment.parse({ mode: 'cloud-shared' }),
      cloud(),
    )
    expect(r.ok).toBe(true)
  })

  it('flags self-host-airgap when cloud.airGapped is false', () => {
    const r = verifyEnterpriseDeployment(
      EnterpriseDeployment.parse({
        mode: 'self-host-airgap',
        controlPlaneHost: 'self.example.com',
      }),
      cloud({ airGapped: false }),
    )
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.code === 'deployment.airgap_flag_mismatch')).toBe(true)
  })

  it('coerces outboundModelTraffic to false on airgap', () => {
    const r = verifyEnterpriseDeployment(
      EnterpriseDeployment.parse({
        mode: 'self-host-airgap',
        controlPlaneHost: 'self.example.com',
        outboundModelTraffic: true,
      }),
      cloud({ airGapped: true }),
    )
    expect(r.normalized.outboundModelTraffic).toBe(false)
  })

  it('requires controlPlaneHost on self-host modes', () => {
    const r = verifyEnterpriseDeployment(
      EnterpriseDeployment.parse({ mode: 'self-host-online' }),
      cloud(),
    )
    expect(r.issues.some((i) => i.code === 'deployment.control_plane_required')).toBe(true)
  })

  it('flags SAML SSO without domain', () => {
    const r = verifyEnterpriseDeployment(
      EnterpriseDeployment.parse({ mode: 'cloud-shared' }),
      cloud({ sso: { provider: 'saml' } }),
    )
    expect(r.issues.some((i) => i.code === 'deployment.saml_domain_missing')).toBe(true)
  })
})
