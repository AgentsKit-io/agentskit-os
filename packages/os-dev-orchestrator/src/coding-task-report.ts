// #368 — coding task reports (tokens, cost, duration, tests, diff summary) for CLI + dashboards.

import type { CodingTaskKind, CodingTaskResult } from '@agentskit/os-core'
import { computeCompletenessScore, type CodingBenchmarkReport, type CodingBenchmarkRow } from './coding-benchmark.js'
import type { DelegationReport, FileConflict } from './coding-delegation.js'
import {
  classifyCodingFailure,
  type CodingFailureClassification,
} from './coding-failure-taxonomy.js'

export type CodingTaskReportMeta = {
  readonly schemaVersion: '1.0'
  readonly generatedAt: string
  readonly source: 'benchmark' | 'delegation'
}

export type CodingTaskReportLinks = {
  readonly traceUrl?: string
  readonly prUrl?: string
  readonly diffArtifactUrl?: string
}

export type CodingTaskTestSummary = {
  readonly commandsObserved: readonly string[]
  readonly anyFailed: boolean
  readonly assumedTestsRan: boolean
}

export type CodingTaskReportRow = {
  readonly providerId: string
  readonly status: CodingTaskResult['status']
  readonly durationMs?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly costUsd?: number
  readonly fileEditCount: number
  readonly completenessScore: number
  readonly summary: string
  readonly errorCode?: string
  readonly worktreePath?: string
  readonly setupError?: string
  readonly editedPaths: readonly string[]
  readonly failure: CodingFailureClassification | null
  readonly tests: CodingTaskTestSummary
}

export type CodingTaskReportAggregate = {
  readonly providerCount: number
  readonly okCount: number
  readonly partialCount: number
  readonly failCount: number
  readonly timeoutCount: number
  readonly totalCostUsd: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly totalDurationMs: number
}

export type CodingTaskReportDiffSummary = {
  readonly uniquePaths: number
  readonly previewPaths: readonly string[]
}

export type CodingTaskReportTask = {
  readonly kind: CodingTaskKind
  readonly prompt: string
  readonly dryRun: boolean
  readonly repoRoot: string
  readonly isolateWorktrees: boolean
}

export type CodingTaskReportDelegationSection = {
  readonly coordinatorSummary: string
  readonly conflicts: readonly FileConflict[]
  readonly suggestHumanInbox: boolean
}

export type CodingTaskReport = {
  readonly meta: CodingTaskReportMeta
  readonly task: CodingTaskReportTask
  readonly aggregate: CodingTaskReportAggregate
  readonly providers: readonly CodingTaskReportRow[]
  readonly links: CodingTaskReportLinks
  readonly diffSummary?: CodingTaskReportDiffSummary
  readonly delegation?: CodingTaskReportDelegationSection
}

export type CodingTaskDashboardRow = {
  readonly providerId: string
  readonly status: CodingTaskResult['status']
  readonly costUsd?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly durationMs?: number
  readonly completenessScore: number
  readonly failureCode?: CodingFailureClassification['code']
  readonly requiresHumanReview: boolean
}

export type CodingTaskDashboardPayload = {
  readonly schemaVersion: '1.0'
  readonly generatedAt: string
  readonly source: CodingTaskReportMeta['source']
  readonly aggregate: CodingTaskReportAggregate
  readonly providers: readonly CodingTaskDashboardRow[]
  readonly links: CodingTaskReportLinks
}

const testSummaryFromResult = (result: CodingTaskResult): CodingTaskTestSummary => {
  const commandsObserved: string[] = []
  let anyFailed = false
  let assumedTestsRan = false
  for (const s of result.shell) {
    commandsObserved.push(s.command)
    if (s.exitCode !== 0) anyFailed = true
    const c = s.command.toLowerCase()
    if (
      c.includes('test')
      || c.includes('vitest')
      || c.includes('jest')
      || c.includes('pytest')
    ) {
      assumedTestsRan = true
    }
  }
  return { commandsObserved, anyFailed, assumedTestsRan }
}

const resultFromBenchmarkRow = (r: CodingBenchmarkRow): CodingTaskResult => {
  const summary =
    r.setupError !== undefined && r.setupError.length > 0
      ? `${r.summary} (${r.setupError})`
      : r.summary
  return {
    providerId: r.providerId,
    status: r.status,
    files: (r.editedPaths ?? []).map((path) => ({ path, op: 'modify' as const, after: '' })),
    shell: [],
    tools: [],
    summary,
    ...(r.durationMs !== undefined ? { durationMs: r.durationMs } : {}),
    ...(r.inputTokens !== undefined ? { inputTokens: r.inputTokens } : {}),
    ...(r.outputTokens !== undefined ? { outputTokens: r.outputTokens } : {}),
    ...(r.costUsd !== undefined ? { costUsd: r.costUsd } : {}),
    ...(r.errorCode !== undefined ? { errorCode: r.errorCode } : {}),
  }
}

const reportRowFromTaskResult = (
  result: CodingTaskResult,
  ctx: {
    providerId?: string
    completenessScore: number
    fileEditCount?: number
    worktreePath?: string
    setupError?: string
    summaryDisplay?: string
  },
): CodingTaskReportRow => ({
  providerId: ctx.providerId ?? result.providerId,
  status: result.status,
  ...(result.durationMs !== undefined ? { durationMs: result.durationMs } : {}),
  ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
  ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
  ...(result.costUsd !== undefined ? { costUsd: result.costUsd } : {}),
  fileEditCount: ctx.fileEditCount ?? result.files.length,
  completenessScore: ctx.completenessScore,
  summary: ctx.summaryDisplay ?? result.summary,
  ...(result.errorCode !== undefined ? { errorCode: result.errorCode } : {}),
  ...(ctx.worktreePath !== undefined ? { worktreePath: ctx.worktreePath } : {}),
  ...(ctx.setupError !== undefined ? { setupError: ctx.setupError } : {}),
  editedPaths: result.files.map((f) => f.path).slice(0, 64),
  failure: classifyCodingFailure(result),
  tests: testSummaryFromResult(result),
})

const reportRowFromBenchmark = (r: CodingBenchmarkRow): CodingTaskReportRow => {
  const base = resultFromBenchmarkRow(r)
  return reportRowFromTaskResult(base, {
    completenessScore: r.completenessScore,
    fileEditCount: r.fileEditCount,
    ...(r.worktreePath !== undefined ? { worktreePath: r.worktreePath } : {}),
    ...(r.setupError !== undefined ? { setupError: r.setupError } : {}),
    summaryDisplay: r.summary,
  })
}

const aggregateFromRows = (rows: readonly CodingTaskReportRow[]): CodingTaskReportAggregate => {
  let okCount = 0
  let partialCount = 0
  let failCount = 0
  let timeoutCount = 0
  let totalCostUsd = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalDurationMs = 0
  for (const r of rows) {
    if (r.status === 'ok') okCount += 1
    else if (r.status === 'partial') partialCount += 1
    else if (r.status === 'fail') failCount += 1
    else if (r.status === 'timeout') timeoutCount += 1
    if (r.costUsd !== undefined) totalCostUsd += r.costUsd
    if (r.inputTokens !== undefined) totalInputTokens += r.inputTokens
    if (r.outputTokens !== undefined) totalOutputTokens += r.outputTokens
    if (r.durationMs !== undefined) totalDurationMs += r.durationMs
  }
  return {
    providerCount: rows.length,
    okCount,
    partialCount,
    failCount,
    timeoutCount,
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    totalDurationMs,
  }
}

const diffSummaryFromRows = (rows: readonly CodingTaskReportRow[]): CodingTaskReportDiffSummary | undefined => {
  const paths = new Set<string>()
  for (const r of rows) {
    for (const p of r.editedPaths) paths.add(p)
  }
  if (paths.size === 0) return undefined
  const previewPaths = [...paths].sort().slice(0, 48)
  return { uniquePaths: paths.size, previewPaths }
}

export type BuildCodingTaskReportOptions = {
  readonly links?: CodingTaskReportLinks
  readonly diffSummary?: CodingTaskReportDiffSummary
  readonly clock?: () => string
}

export const buildCodingTaskReportFromBenchmark = (
  benchmark: CodingBenchmarkReport,
  opts: BuildCodingTaskReportOptions = {},
): CodingTaskReport => {
  const clock = opts.clock ?? (() => new Date().toISOString())
  const providers = benchmark.rows.map(reportRowFromBenchmark)
  const diffSummary = opts.diffSummary ?? diffSummaryFromRows(providers)
  return {
    meta: { schemaVersion: '1.0', generatedAt: clock(), source: 'benchmark' },
    task: {
      kind: benchmark.kind,
      prompt: benchmark.prompt,
      dryRun: benchmark.dryRun,
      repoRoot: benchmark.repoRoot,
      isolateWorktrees: benchmark.isolateWorktrees,
    },
    aggregate: aggregateFromRows(providers),
    providers,
    links: opts.links ?? {},
    ...(diffSummary !== undefined ? { diffSummary } : {}),
  }
}

export const buildCodingTaskReportFromDelegation = (
  delegation: DelegationReport,
  task: CodingTaskReportTask,
  opts: BuildCodingTaskReportOptions = {},
): CodingTaskReport => {
  const clock = opts.clock ?? (() => new Date().toISOString())
  const providers: CodingTaskReportRow[] = delegation.subtasks.map((st) =>
    reportRowFromTaskResult(st.result, {
      providerId: st.providerId,
      completenessScore: computeCompletenessScore(st.result),
      ...(st.worktreePath !== undefined ? { worktreePath: st.worktreePath } : {}),
    }),
  )
  const diffSummary = opts.diffSummary ?? diffSummaryFromRows(providers)
  return {
    meta: { schemaVersion: '1.0', generatedAt: clock(), source: 'delegation' },
    task,
    aggregate: aggregateFromRows(providers),
    providers,
    links: opts.links ?? {},
    ...(diffSummary !== undefined ? { diffSummary } : {}),
    delegation: {
      coordinatorSummary: delegation.coordinatorSummary,
      conflicts: delegation.conflicts,
      suggestHumanInbox: delegation.suggestHumanInbox,
    },
  }
}

export const toCodingTaskDashboardPayload = (report: CodingTaskReport): CodingTaskDashboardPayload => ({
  schemaVersion: '1.0',
  generatedAt: report.meta.generatedAt,
  source: report.meta.source,
  aggregate: report.aggregate,
  links: report.links,
  providers: report.providers.map((p) => ({
    providerId: p.providerId,
    status: p.status,
    ...(p.costUsd !== undefined ? { costUsd: p.costUsd } : {}),
    ...(p.inputTokens !== undefined ? { inputTokens: p.inputTokens } : {}),
    ...(p.outputTokens !== undefined ? { outputTokens: p.outputTokens } : {}),
    ...(p.durationMs !== undefined ? { durationMs: p.durationMs } : {}),
    completenessScore: p.completenessScore,
    ...(p.failure != null ? { failureCode: p.failure.code } : {}),
    requiresHumanReview: p.failure?.requiresHumanReview ?? false,
  })),
})

const esc = (s: string): string =>
  s.replaceAll('|', '\\|').replaceAll('\n', ' ').slice(0, 500)

export const renderCodingTaskReportMarkdown = (report: CodingTaskReport): string => {
  const lines: string[] = []
  lines.push(`# Coding task report`)
  lines.push('')
  lines.push(`- Generated: \`${report.meta.generatedAt}\``)
  lines.push(`- Source: **${report.meta.source}**`)
  lines.push(`- Task kind: \`${report.task.kind}\` · dryRun: **${report.task.dryRun}**`)
  lines.push(`- Repo: \`${report.task.repoRoot}\``)
  if (report.links.traceUrl !== undefined) lines.push(`- Trace: ${report.links.traceUrl}`)
  if (report.links.prUrl !== undefined) lines.push(`- PR: ${report.links.prUrl}`)
  lines.push('')
  lines.push(`## Aggregate`)
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('| --- | --- |')
  lines.push(`| Providers | ${report.aggregate.providerCount} |`)
  lines.push(`| ok / partial / fail / timeout | ${report.aggregate.okCount} / ${report.aggregate.partialCount} / ${report.aggregate.failCount} / ${report.aggregate.timeoutCount} |`)
  lines.push(`| Total USD | ${report.aggregate.totalCostUsd.toFixed(6)} |`)
  lines.push(`| Total tokens (in+out) | ${report.aggregate.totalInputTokens + report.aggregate.totalOutputTokens} |`)
  lines.push(`| Total duration (ms) | ${report.aggregate.totalDurationMs} |`)
  lines.push('')
  if (report.diffSummary !== undefined) {
    lines.push(`## Diff summary`)
    lines.push('')
    lines.push(`- Unique paths: **${report.diffSummary.uniquePaths}**`)
    lines.push(`- Preview: ${report.diffSummary.previewPaths.map((p) => `\`${p}\``).join(', ') || '—'}`)
    lines.push('')
  }
  if (report.delegation !== undefined) {
    lines.push(`## Delegation`)
    lines.push('')
    lines.push(report.delegation.coordinatorSummary)
    lines.push('')
    if (report.delegation.conflicts.length > 0) {
      lines.push('### Path conflicts')
      for (const c of report.delegation.conflicts) {
        lines.push(`- \`${c.path}\`: ${c.providers.join(', ')}`)
      }
      lines.push('')
    }
    if (report.delegation.suggestHumanInbox) {
      lines.push(`_Suggested: human inbox review._`)
      lines.push('')
    }
  }
  const failureHints = report.providers
    .map((p) => p.failure)
    .filter((f): f is CodingFailureClassification => f != null)
  const uniqHints = [...new Map(failureHints.map((f) => [f.code, f])).values()]
  if (uniqHints.length > 0) {
    lines.push(`## Failure recovery`)
    lines.push('')
    for (const f of uniqHints) {
      lines.push(`### ${f.code} (${f.severity})`)
      lines.push(`${f.suggestedRecovery}`)
      lines.push('')
      lines.push(
        `Retry: \`${f.retryPolicy}\` · Human review: **${f.requiresHumanReview ? 'yes' : 'no'}** · Actions: ${f.recoveryActions.join(', ')}`,
      )
      lines.push('')
    }
  }

  lines.push(`## Providers`)
  lines.push('')
  lines.push(
    '| Provider | Status | Score | USD | tok in/out | ms | Failure | Review | Summary |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const p of report.providers) {
    const fail = p.failure?.code ?? '—'
    const rev = p.failure?.requiresHumanReview === true ? 'yes' : 'no'
    const tok = `${p.inputTokens ?? 0}/${p.outputTokens ?? 0}`
    lines.push(
      `| ${esc(p.providerId)} | ${p.status} | ${p.completenessScore} | ${(p.costUsd ?? 0).toFixed(4)} | ${tok} | ${p.durationMs ?? '—'} | ${fail} | ${rev} | ${esc(p.summary)} |`,
    )
  }
  lines.push('')
  lines.push(`## Tests (observed shell)`)
  lines.push('')
  for (const p of report.providers) {
    if (p.tests.commandsObserved.length === 0) continue
    lines.push(`### ${p.providerId}`)
    lines.push(
      `- Ran: ${p.tests.assumedTestsRan} · anyFailed: ${p.tests.anyFailed} · commands: ${p.tests.commandsObserved.map((c) => `\`${esc(c)}\``).join(', ')}`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

export const serializeCodingTaskReportJson = (report: CodingTaskReport): string =>
  `${JSON.stringify(report, null, 2)}\n`
