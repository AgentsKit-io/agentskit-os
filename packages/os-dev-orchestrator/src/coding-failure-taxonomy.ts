// #376 — typed failure taxonomy + recovery hints for dev orchestration.

import type { CodingTaskResult } from '@agentskit/os-core'

export type CodingFailureCode =
  | 'no_diff'
  | 'invalid_diff'
  | 'tests_failed'
  | 'permission_denied'
  | 'provider_timeout'
  | 'merge_conflict'
  | 'hallucinated_file'
  | 'oversized_patch'
  | 'secret_leak'
  | 'provider_unavailable'
  | 'unknown'

export type FailureSeverity = 'info' | 'warning' | 'error' | 'critical'

export type RetryPolicy = 'none' | 'retry_same' | 'retry_backoff' | 'alternate_provider'

export type CodingRecoveryAction =
  | 'retry'
  | 'alternate_provider'
  | 'human_inbox'
  | 'rollback'
  | 'benchmark_compare'

export type CodingFailureClassification = {
  readonly code: CodingFailureCode
  readonly severity: FailureSeverity
  readonly suggestedRecovery: string
  readonly retryPolicy: RetryPolicy
  readonly requiresHumanReview: boolean
  readonly recoveryActions: readonly CodingRecoveryAction[]
  /** How the classifier chose this bucket (for traces / reports). */
  readonly source: 'status' | 'error_code' | 'shell' | 'heuristic'
}

type CatalogEntry = Omit<CodingFailureClassification, 'source'>

const entry = (e: CatalogEntry): CatalogEntry => e

export const CODING_FAILURE_CATALOG: Readonly<Record<CodingFailureCode, CatalogEntry>> = {
  no_diff: entry({
    code: 'no_diff',
    severity: 'warning',
    suggestedRecovery:
      'Widen the prompt or grant write scope; confirm the provider received the correct repo root.',
    retryPolicy: 'retry_same',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'alternate_provider'],
  }),
  invalid_diff: entry({
    code: 'invalid_diff',
    severity: 'error',
    suggestedRecovery:
      'Re-run with a smaller task, verify JSON/tooling output, or switch provider; inspect stderr.',
    retryPolicy: 'alternate_provider',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'alternate_provider', 'benchmark_compare'],
  }),
  tests_failed: entry({
    code: 'tests_failed',
    severity: 'error',
    suggestedRecovery:
      'Open the failing test log, fix code or tests, then retry; compare providers if multi-agent.',
    retryPolicy: 'retry_same',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'benchmark_compare', 'human_inbox'],
  }),
  permission_denied: entry({
    code: 'permission_denied',
    severity: 'error',
    suggestedRecovery:
      'Grant filesystem or sandbox permissions, or narrow writeScope to allowed paths.',
    retryPolicy: 'none',
    requiresHumanReview: true,
    recoveryActions: ['human_inbox', 'rollback'],
  }),
  provider_timeout: entry({
    code: 'provider_timeout',
    severity: 'warning',
    suggestedRecovery:
      'Increase timeoutMs, split the task, or try a faster model/provider.',
    retryPolicy: 'retry_backoff',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'alternate_provider'],
  }),
  merge_conflict: entry({
    code: 'merge_conflict',
    severity: 'error',
    suggestedRecovery:
      'Resolve conflicts locally, rebase, or serialize provider runs to avoid overlapping edits.',
    retryPolicy: 'none',
    requiresHumanReview: true,
    recoveryActions: ['human_inbox', 'rollback', 'benchmark_compare'],
  }),
  hallucinated_file: entry({
    code: 'hallucinated_file',
    severity: 'critical',
    suggestedRecovery:
      'Reject the patch, tighten readScope/writeScope, and require human review before apply.',
    retryPolicy: 'none',
    requiresHumanReview: true,
    recoveryActions: ['rollback', 'human_inbox'],
  }),
  oversized_patch: entry({
    code: 'oversized_patch',
    severity: 'error',
    suggestedRecovery:
      'Split into smaller tasks, reduce batch size, or cap file edits in the provider prompt.',
    retryPolicy: 'retry_same',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'alternate_provider'],
  }),
  secret_leak: entry({
    code: 'secret_leak',
    severity: 'critical',
    suggestedRecovery:
      'Rotate leaked credentials immediately; discard the patch and audit logs.',
    retryPolicy: 'none',
    requiresHumanReview: true,
    recoveryActions: ['rollback', 'human_inbox'],
  }),
  provider_unavailable: entry({
    code: 'provider_unavailable',
    severity: 'error',
    suggestedRecovery:
      'Install or authenticate the CLI, check PATH, or route to an alternate provider.',
    retryPolicy: 'alternate_provider',
    requiresHumanReview: false,
    recoveryActions: ['alternate_provider', 'retry'],
  }),
  unknown: entry({
    code: 'unknown',
    severity: 'error',
    suggestedRecovery:
      'Inspect summary, errorCode, and shell entries; capture logs for triage.',
    retryPolicy: 'retry_same',
    requiresHumanReview: false,
    recoveryActions: ['retry', 'human_inbox', 'benchmark_compare'],
  }),
}

const withSource = (
  code: CodingFailureCode,
  source: CodingFailureClassification['source'],
): CodingFailureClassification => {
  const row = CODING_FAILURE_CATALOG[code]
  return { ...row, source }
}

const lower = (s: string | undefined): string => (s ?? '').toLowerCase()

const combinedText = (result: CodingTaskResult): string => {
  const parts = [result.summary, result.errorCode ?? '']
  for (const s of result.shell) {
    parts.push(s.stderr, s.stdout, s.command)
  }
  return parts.join('\n').toLowerCase()
}

const OVERSIZED_PATCH_BYTES = 200_000

const patchByteSize = (result: CodingTaskResult): number => {
  let n = 0
  for (const f of result.files) {
    n += f.after.length
    if (f.before !== undefined) n += f.before.length
  }
  return n
}

const looksLikeTestCommand = (cmd: string): boolean => {
  const c = lower(cmd)
  if (c.includes('vitest')) return true
  if (c.includes('jest')) return true
  if (c.includes('mocha')) return true
  if (c.includes('pytest')) return true
  if (c.includes('cargo test')) return true
  if (c.includes('go test')) return true
  if (c.includes('npm test') || c.includes('pnpm test') || c.includes('yarn test')) return true
  if (c.includes('dotnet test')) return true
  return false
}

const hasHallucinatedPath = (result: CodingTaskResult): boolean => {
  for (const f of result.files) {
    const p = f.path.replaceAll('\\', '/')
    if (p.startsWith('/etc/') || p.startsWith('/sys/')) return true
    if (p.toLowerCase().includes('system32')) return true
  }
  return false
}

const hasSecretLeakHint = (text: string): boolean => {
  if (text.includes('sk-')) return true
  if (text.includes('api_key') || text.includes('apikey')) return true
  if (text.includes('bearer ')) return true
  if (text.includes('-----begin')) return true
  return false
}

/**
 * Map a provider result to a failure bucket for traces, reports, and dashboards.
 * Returns `null` when the run is a clean success (ok, passing shell, no leak signals).
 */
export const classifyCodingFailure = (result: CodingTaskResult): CodingFailureClassification | null => {
  const text = combinedText(result)

  if (hasSecretLeakHint(text)) {
    return withSource('secret_leak', 'heuristic')
  }

  if (hasHallucinatedPath(result)) {
    return withSource('hallucinated_file', 'heuristic')
  }

  if (patchByteSize(result) > OVERSIZED_PATCH_BYTES) {
    return withSource('oversized_patch', 'heuristic')
  }

  if (result.status === 'timeout') {
    return withSource('provider_timeout', 'status')
  }

  const ec = lower(result.errorCode)

  if (ec.includes('not_found') || ec.includes('unavailable') || ec === 'benchmark.run_threw') {
    return withSource('provider_unavailable', 'error_code')
  }

  if (ec.includes('permission') || text.includes('eacces') || text.includes('permission denied')) {
    return withSource('permission_denied', 'error_code')
  }

  if (ec.includes('bad_json') || ec.includes('invalid') || ec.includes('malformed')) {
    return withSource('invalid_diff', 'error_code')
  }

  if (ec.includes('merge') || text.includes('merge conflict') || text.includes('<<<<<<<')) {
    return withSource('merge_conflict', 'heuristic')
  }

  if (ec.includes('no_diff')) {
    return withSource('no_diff', 'error_code')
  }

  let shellTestFailed = false
  for (const s of result.shell) {
    if (s.exitCode === 0) continue
    if (looksLikeTestCommand(s.command)) {
      shellTestFailed = true
      break
    }
  }

  if (shellTestFailed) {
    return withSource('tests_failed', 'shell')
  }

  if (result.status === 'fail' || result.status === 'partial') {
    if (ec.includes('test')) {
      return withSource('tests_failed', 'error_code')
    }
    if (result.files.length === 0 && ec.length === 0 && result.status === 'fail') {
      return withSource('no_diff', 'heuristic')
    }
    if (result.files.length === 0 && ec.length > 0) {
      return withSource('invalid_diff', 'error_code')
    }
    return withSource('unknown', 'heuristic')
  }

  if (result.status === 'ok') {
    for (const s of result.shell) {
      if (s.exitCode !== 0) {
        return withSource('tests_failed', 'shell')
      }
    }
    return null
  }

  return withSource('unknown', 'heuristic')
}
