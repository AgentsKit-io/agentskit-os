import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type SecurityStatus = 'healthy' | 'watch' | 'blocked'
export type SecurityArea = 'audit' | 'vault' | 'policy' | 'privacy'

export type SecurityControl = {
  readonly id: string
  readonly name: string
  readonly area: SecurityArea
  readonly status: SecurityStatus
  readonly owner: string
  readonly lastCheckedAt: string
  readonly evidence: string
  readonly coveragePct: number
  readonly findings: number
  readonly notes: readonly string[]
}

type SecurityState = {
  readonly controls: readonly SecurityControl[]
  readonly loading: boolean
  readonly error: string | null
}

export const SECURITY_CONTROLS_FIXTURE: readonly SecurityControl[] = [
  {
    id: 'sec-audit-chain',
    name: 'Hash-chained audit log',
    area: 'audit',
    status: 'healthy',
    owner: 'Platform Security',
    lastCheckedAt: '2026-05-04T19:41:00.000Z',
    evidence: 'audit.chain.verify',
    coveragePct: 98,
    findings: 0,
    notes: ['Run, tool, HITL, and cost events have signed evidence', 'PII reveal events require manager approval'],
  },
  {
    id: 'sec-vault-rotation',
    name: 'Provider secret rotation',
    area: 'vault',
    status: 'watch',
    owner: 'Infra',
    lastCheckedAt: '2026-05-04T18:55:00.000Z',
    evidence: 'vault.rotation.report',
    coveragePct: 82,
    findings: 2,
    notes: ['Cursor token owner missing renewal date', 'Teams trigger secret rotates in 6 days'],
  },
  {
    id: 'sec-policy-egress',
    name: 'Tool egress allowlist',
    area: 'policy',
    status: 'healthy',
    owner: 'Agent Runtime',
    lastCheckedAt: '2026-05-04T19:12:00.000Z',
    evidence: 'policy.egress.evaluate',
    coveragePct: 94,
    findings: 0,
    notes: ['Slack, GitHub, and webhook tools have scoped domains', 'Unknown domains require HITL approval'],
  },
  {
    id: 'sec-privacy-routing',
    name: 'Regional privacy routing',
    area: 'privacy',
    status: 'blocked',
    owner: 'Compliance',
    lastCheckedAt: '2026-05-04T17:30:00.000Z',
    evidence: 'privacy.region.route',
    coveragePct: 61,
    findings: 4,
    notes: ['EU clinic template missing provider region lock', 'APAC routing contract still pending review'],
  },
]

function normalizeSecurityControls(value: unknown): readonly SecurityControl[] {
  return Array.isArray(value) ? (value as readonly SecurityControl[]) : SECURITY_CONTROLS_FIXTURE
}

export function useSecurityControls(): SecurityState {
  const [state, setState] = useState<SecurityState>({
    controls: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly SecurityControl[]>('security.controls')
      .then((result) => {
        if (!cancelled) {
          setState({ controls: normalizeSecurityControls(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            controls: SECURITY_CONTROLS_FIXTURE,
            loading: false,
            error: error instanceof Error ? error.message : null,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
