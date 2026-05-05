import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  CodingAgentProvider,
  CodingTaskKind,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createCodingAgentWorktreeManager, type GitRunner } from './git-worktree-manager.js'

export type CodingBenchmarkRow = {
  readonly providerId: string
  readonly status: CodingTaskResult['status']
  readonly durationMs?: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly costUsd?: number
  readonly fileEditCount: number
  /** Heuristic 0–100 (#366); not a substitute for human review. */
  readonly completenessScore: number
  readonly errorCode?: string
  readonly summary: string
  readonly worktreePath?: string
  readonly setupError?: string
}

export type CodingBenchmarkReport = {
  readonly kind: CodingTaskKind
  readonly prompt: string
  readonly dryRun: boolean
  readonly isolateWorktrees: boolean
  readonly repoRoot: string
  readonly rows: readonly CodingBenchmarkRow[]
}

const rowFromResult = (result: CodingTaskResult, worktreePath?: string): CodingBenchmarkRow => ({
  providerId: result.providerId,
  status: result.status,
  ...(result.durationMs !== undefined ? { durationMs: result.durationMs } : {}),
  ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
  ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
  ...(result.costUsd !== undefined ? { costUsd: result.costUsd } : {}),
  fileEditCount: result.files.length,
  completenessScore: computeCompletenessScore(result),
  ...(result.errorCode !== undefined ? { errorCode: result.errorCode } : {}),
  summary: result.summary,
  ...(worktreePath !== undefined ? { worktreePath } : {}),
})

/**
 * Normalized comparison score for benchmark tables (#366).
 * Favors `ok` / low file churn in dry-run; extend when test runner is wired.
 */
export const computeCompletenessScore = (result: CodingTaskResult): number => {
  const base =
    result.status === 'ok'
      ? 100
      : result.status === 'partial'
        ? 60
        : result.status === 'timeout'
          ? 25
          : 0
  const scopePenalty = Math.min(30, result.files.length * 4)
  return Math.max(0, Math.round(base - scopePenalty))
}

const buildTask = (
  kind: CodingTaskKind,
  prompt: string,
  cwd: string,
  dryRun: boolean,
  timeoutMs: number,
): CodingTaskRequest => ({
  kind,
  prompt,
  cwd,
  readScope: ['**/*'],
  writeScope: dryRun ? [] : ['**/*'],
  granted: ['edit_files', 'run_shell', 'run_tests'],
  timeoutMs,
  dryRun,
})

/**
 * Run the same coding task sequentially across providers (#366).
 * When `isolateWorktrees` is true, each provider gets a detached worktree under the OS temp dir
 * (requires a valid git repo at `repoRoot`).
 */
export const runCodingAgentBenchmark = async (opts: {
  readonly repoRoot: string
  readonly providers: readonly CodingAgentProvider[]
  readonly kind: CodingTaskKind
  readonly prompt: string
  readonly dryRun: boolean
  readonly isolateWorktrees: boolean
  readonly timeoutMs?: number
  readonly gitRunner?: GitRunner
}): Promise<CodingBenchmarkReport> => {
  const rows: CodingBenchmarkRow[] = []
  const wm = opts.isolateWorktrees
    ? createCodingAgentWorktreeManager(
        opts.gitRunner !== undefined
          ? { repoRoot: opts.repoRoot, runner: opts.gitRunner }
          : { repoRoot: opts.repoRoot },
      )
    : undefined

  for (let i = 0; i < opts.providers.length; i += 1) {
    const p = opts.providers[i]!
    const pid = p.info.id
    let cwd = opts.repoRoot
    let worktreePath: string | undefined
    let taskId: string | undefined

    if (wm) {
      const basePath = await mkdtemp(join(tmpdir(), `ak-bench-${pid}-`))
      taskId = `bench-${pid}-${i}-${Date.now()}`
      const created = await wm.createForTask({
        taskId,
        providerId: pid,
        path: basePath,
        branch: '',
        cleanupDefault: 'delete',
      })
      if (!created.ok) {
        rows.push({
          providerId: pid,
          status: 'fail',
          fileEditCount: 0,
          completenessScore: 0,
          summary: created.error,
          setupError: created.error,
        })
        continue
      }
      cwd = created.meta.path
      worktreePath = created.meta.path
    }

    const req = buildTask(opts.kind, opts.prompt, cwd, opts.dryRun, opts.timeoutMs ?? 120_000)

    try {
      const result = await p.runTask(req)
      rows.push(rowFromResult(result, worktreePath))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      rows.push({
        providerId: pid,
        status: 'fail',
        fileEditCount: 0,
        completenessScore: 0,
        summary: msg,
        errorCode: 'benchmark.run_threw',
        ...(worktreePath !== undefined ? { worktreePath } : {}),
      })
    } finally {
      if (wm && taskId) {
        await wm.finalize(taskId, 'delete').catch(() => {})
      }
    }
  }

  return {
    kind: opts.kind,
    prompt: opts.prompt,
    dryRun: opts.dryRun,
    isolateWorktrees: opts.isolateWorktrees,
    repoRoot: opts.repoRoot,
    rows,
  }
}
