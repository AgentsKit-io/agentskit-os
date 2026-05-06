import type { HitlKind, HitlRisk, HitlStatus } from './use-hitl'

export const HITL_KIND_LABEL: Record<HitlKind, string> = {
  code_change: 'Code change',
  cost_exception: 'Cost exception',
  deploy_gate: 'Deploy gate',
  data_access: 'Data access',
  clinical_review: 'Clinical review',
  client_approval: 'Client approval',
  failed_run: 'Failed run',
}

export const HITL_STATUS_LABEL: Record<HitlStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  expired: 'Expired',
}

export const HITL_RISK_LABEL: Record<HitlRisk, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}
