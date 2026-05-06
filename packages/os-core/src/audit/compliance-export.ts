// Per #111 — compliance export wizard bundle builder.
// Pure: assembles a per-regime evidence bundle from sources the runtime
// already produces (audit chain, redaction profile id, policy snapshot,
// HITL decisions). Storage layer ships the bundle; this module only builds it.

import type { AuditBatch } from './batch.js'
import type { HitlTask } from '../hitl/inbox.js'

export type ComplianceRegime = 'soc2' | 'hipaa' | 'gdpr'

export type ComplianceExportInput = {
  readonly workspaceId: string
  readonly regime: ComplianceRegime
  readonly windowStartIso: string
  readonly windowEndIso: string
  readonly auditBatches: readonly AuditBatch[]
  readonly hitlDecisions: readonly HitlTask[]
  /** Workspace policy snapshot at the time of export (any JSON). */
  readonly policySnapshot: unknown
  /** Active redaction profile id (#439). */
  readonly redactionProfileId: string
  /** Build metadata captured by the runtime. */
  readonly build: {
    readonly version: string
    readonly commitSha?: string
  }
}

export type ComplianceArtifact = {
  readonly id: string
  readonly title: string
  readonly content: unknown
}

export type ComplianceExportBundle = {
  readonly schemaVersion: '1.0'
  readonly regime: ComplianceRegime
  readonly workspaceId: string
  readonly window: { readonly start: string; readonly end: string }
  readonly generatedAt: string
  readonly summary: {
    readonly auditBatchCount: number
    readonly auditEventCount: number
    readonly hitlOpenCount: number
    readonly hitlApprovedCount: number
    readonly hitlRejectedCount: number
  }
  readonly artifacts: readonly ComplianceArtifact[]
  /** Auto-generated checklist of regime controls covered by this bundle. */
  readonly controlsChecklist: readonly { readonly control: string; readonly evidenceArtifactId: string }[]
}

const REGIME_CONTROLS: Readonly<Record<ComplianceRegime, readonly { control: string; artifact: string }[]>> = {
  soc2: [
    { control: 'CC7.2 — System monitoring (audit chain)', artifact: 'audit-chain' },
    { control: 'CC6.1 — Logical access (HITL decisions)', artifact: 'hitl-decisions' },
    { control: 'CC8.1 — Change mgmt (workspace policy snapshot)', artifact: 'policy-snapshot' },
  ],
  hipaa: [
    { control: '§164.308(a)(1) — Security mgmt process', artifact: 'audit-chain' },
    { control: '§164.312(b) — Audit controls', artifact: 'audit-chain' },
    { control: '§164.514 — De-identification (redaction profile id)', artifact: 'redaction-profile' },
  ],
  gdpr: [
    { control: 'Art. 5(1)(f) — Integrity & confidentiality (audit chain)', artifact: 'audit-chain' },
    { control: 'Art. 30 — Records of processing (policy snapshot)', artifact: 'policy-snapshot' },
    { control: 'Art. 32 — Security of processing (redaction profile id)', artifact: 'redaction-profile' },
  ],
}

const summarize = (input: ComplianceExportInput) => ({
  auditBatchCount: input.auditBatches.length,
  auditEventCount: input.auditBatches.reduce((n, b) => n + b.events.length, 0),
  hitlOpenCount: input.hitlDecisions.filter((t) => t.status === 'open').length,
  hitlApprovedCount: input.hitlDecisions.filter((t) => t.status === 'approved').length,
  hitlRejectedCount: input.hitlDecisions.filter((t) => t.status === 'rejected').length,
})

const buildArtifacts = (input: ComplianceExportInput): readonly ComplianceArtifact[] => [
  { id: 'audit-chain', title: 'Audit chain (signed batches)', content: input.auditBatches },
  { id: 'hitl-decisions', title: 'HITL decisions in window', content: input.hitlDecisions },
  { id: 'policy-snapshot', title: 'Workspace policy at export time', content: input.policySnapshot },
  {
    id: 'redaction-profile',
    title: 'Active redaction profile id',
    content: { profileId: input.redactionProfileId },
  },
  {
    id: 'build-metadata',
    title: 'Runtime build metadata',
    content: input.build,
  },
]

/**
 * Build a regime-aware compliance export bundle (#111). Pure; storage stays
 * a caller concern. The `controlsChecklist` is auto-generated from
 * `REGIME_CONTROLS[regime]` so reviewers see every control mapped to the
 * artifact id that supplies its evidence.
 */
export const buildComplianceExportBundle = (
  input: ComplianceExportInput,
  opts: { readonly clock?: () => string } = {},
): ComplianceExportBundle => {
  const generatedAt = (opts.clock ?? (() => new Date().toISOString()))()
  const artifacts = buildArtifacts(input)
  const checklist = REGIME_CONTROLS[input.regime].map((c) => ({
    control: c.control,
    evidenceArtifactId: c.artifact,
  }))
  return {
    schemaVersion: '1.0',
    regime: input.regime,
    workspaceId: input.workspaceId,
    window: { start: input.windowStartIso, end: input.windowEndIso },
    generatedAt,
    summary: summarize(input),
    artifacts,
    controlsChecklist: checklist,
  }
}
