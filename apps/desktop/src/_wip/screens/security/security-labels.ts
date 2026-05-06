import type { SecurityArea, SecurityStatus } from './use-security'

export const SECURITY_AREA_LABEL: Record<SecurityArea, string> = {
  audit: 'Audit',
  vault: 'Vault',
  policy: 'Policy',
  privacy: 'Privacy',
}

export const SECURITY_STATUS_LABEL: Record<SecurityStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  blocked: 'Blocked',
}
