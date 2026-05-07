// Per #124 — enterprise self-host + SSO + air-gapped deployment descriptor.
// Pure: schema for the deployment + a verifier that flags configs that
// won't work (e.g. air-gapped + cloud endpoint, SAML SSO without domain).

import { z } from 'zod'
import type { CloudSyncConfig } from '../schema/cloud.js'

export const EnterpriseDeploymentMode = z.enum([
  'cloud-shared',
  'cloud-isolated-tenant',
  'self-host-online',
  'self-host-airgap',
])
export type EnterpriseDeploymentMode = z.infer<typeof EnterpriseDeploymentMode>

export const EnterpriseDeployment = z.object({
  schemaVersion: z.literal(1).default(1),
  mode: EnterpriseDeploymentMode,
  /** Hostname of the self-host control plane; required for self-host modes. */
  controlPlaneHost: z.string().min(1).max(256).optional(),
  /** Whether outbound model traffic is permitted. Forced false on airgap. */
  outboundModelTraffic: z.boolean().default(true),
  /** Customer-managed encryption key reference. */
  cmekRef: z.string().min(1).max(256).optional(),
})
export type EnterpriseDeployment = z.infer<typeof EnterpriseDeployment>

export type DeploymentIssue = {
  readonly code: string
  readonly message: string
}

export type DeploymentReport = {
  readonly ok: boolean
  readonly issues: readonly DeploymentIssue[]
  readonly normalized: EnterpriseDeployment
}

const requiresControlPlane = (mode: EnterpriseDeploymentMode): boolean =>
  mode === 'self-host-online' || mode === 'self-host-airgap'

/**
 * Verify a deployment descriptor against the workspace cloud config (#124).
 * Returns one report with per-issue codes the CLI surfaces as warnings.
 */
export const verifyEnterpriseDeployment = (
  deployment: EnterpriseDeployment,
  cloud: Pick<CloudSyncConfig, 'airGapped' | 'sso' | 'endpoint'>,
): DeploymentReport => {
  const issues: DeploymentIssue[] = []
  const normalizedOutbound = deployment.mode === 'self-host-airgap' ? false : deployment.outboundModelTraffic

  if (requiresControlPlane(deployment.mode) && deployment.controlPlaneHost === undefined) {
    issues.push({
      code: 'deployment.control_plane_required',
      message: `mode=${deployment.mode} requires controlPlaneHost`,
    })
  }
  if (deployment.mode === 'self-host-airgap' && cloud.airGapped !== true) {
    issues.push({
      code: 'deployment.airgap_flag_mismatch',
      message: 'self-host-airgap mode requires CloudSyncConfig.airGapped=true',
    })
  }
  if (deployment.mode === 'self-host-airgap' && deployment.outboundModelTraffic === true) {
    issues.push({
      code: 'deployment.airgap_outbound_disallowed',
      message: 'airgap mode coerced outboundModelTraffic to false',
    })
  }
  if (cloud.sso.provider === 'saml' && cloud.sso.domain === undefined) {
    issues.push({
      code: 'deployment.saml_domain_missing',
      message: 'SAML SSO requires sso.domain to be configured',
    })
  }
  return {
    ok: issues.length === 0,
    issues,
    normalized: { ...deployment, outboundModelTraffic: normalizedOutbound },
  }
}

export const parseEnterpriseDeployment = (input: unknown): EnterpriseDeployment =>
  EnterpriseDeployment.parse(input)
export const safeParseEnterpriseDeployment = (input: unknown) =>
  EnterpriseDeployment.safeParse(input)
