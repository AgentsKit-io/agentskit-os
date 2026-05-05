import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  CodingAgentProvider,
  CodingTaskKind,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import {
  artifactFilenameForBenchmarkStep,
  buildCodingRunArtifactPayload,
  resolveHeadOidSafe,
  tryGitRefDiffSummary,
  writeCodingRunArtifactFile,
  type CodingAgentArtifactIds,
  type CodingRunArtifactPayload,
  type CodingRunArtifactPhase,
  type CodingRunGitRefDiffSummary,
} from './coding-run-artifacts.js'
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
  /** Sample of edited paths for task reports / diff summaries (#368). */
  readonly editedPaths?: readonly string[]
}

export type CodingBenchmarkReport = {
  readonly kind: CodingTaskKind
  readonly prompt: string
  readonly dryRun: boolean
  readonly isolateWorktrees: boolean
  readonly repoRoot: string
  readonly rows: readonly CodingBenchmarkRow[]
}

export type CodingBenchmarkArtifactsOpts = {
  readonly outDir: string
  readonly runId: string
  readonly traceId?: string
  readonly redact?: (s: string) => string
}

const gitSnapshotAfterRun = async (
  cwd: string,
  headBefore: string | undefined,
): Promise<CodingRunArtifactPayload['git'] | undefined> => {
  const headAfter = await resolveHeadOidSafe(cwd)
  let refDiff: CodingRunGitRefDiffSummary | undefined
  if (headBefore !== undefined && headAfter !== undefined && headBefore !== headAfter) {
    refDiff = await tryGitRefDiffSummary(cwd, headBefore, headAfter)
  }
  const git: NonNullable<CodingRunArtifactPayload['git']> = {
    ...(headBefore !== undefined ? { headBefore } : {}),
    ...(headAfter !== undefined ? { headAfter } : {}),
    ...(refDiff !== undefined ? { refDiff } : {}),
  }
  if (
    headBefore === undefined &&
    headAfter === undefined &&
    refDiff === undefined
  ) {
    return undefined
  }
  return git
}

const rowFromResult = (result: CodingTaskResult, worktreePath?: string): CodingBenchmarkRow => {
  const paths = result.files.map((f) => f.path)
  const editedPaths = paths.length > 0 ? paths.slice(0, 64) : undefined
  return {
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
    ...(editedPaths !== undefined ? { editedPaths } : {}),
  }
}

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
  readonly artifacts?: CodingBenchmarkArtifactsOpts
  readonly signal?: AbortSignal
}): Promise<CodingBenchmarkReport> => {
  const rows: CodingBenchmarkRow[] = []
  const wm = opts.isolateWorktrees
    ? createCodingAgentWorktreeManager(
        opts.gitRunner !== undefined
          ? { repoRoot: opts.repoRoot, runner: opts.gitRunner }
          : { repoRoot: opts.repoRoot },
      )
    : undefined

  const persistArtifact = async (args: {
    readonly index: number
    readonly providerId: string
    readonly worktreePath: string | undefined
    readonly cwdForWorktreeId: string
    readonly taskId: string | undefined
    readonly phase: CodingRunArtifactPhase
    readonly setupError?: string
    readonly taskRequest?: CodingTaskRequest
    readonly taskResult?: CodingTaskResult
    readonly git?: CodingRunArtifactPayload['git']
  }): Promise<void> => {
    if (opts.artifacts === undefined) {
      return
    }
    const worktreeId = args.worktreePath ?? args.cwdForWorktreeId
    const ids: CodingAgentArtifactIds = {
      runId: opts.artifacts.runId,
      taskId: args.taskId ?? `bench-step-${args.index}-${args.providerId}`,
      providerId: args.providerId,
      worktreeId,
      ...(opts.artifacts.traceId !== undefined ? { traceId: opts.artifacts.traceId } : {}),
    }
    const payload = buildCodingRunArtifactPayload({
      ids,
      benchmarkIndex: args.index,
      phase: args.phase,
      ...(args.setupError !== undefined ? { setupError: args.setupError } : {}),
      ...(args.taskRequest !== undefined ? { taskRequest: args.taskRequest } : {}),
      ...(args.taskResult !== undefined ? { taskResult: args.taskResult } : {}),
      ...(args.git !== undefined ? { git: args.git } : {}),
      ...(opts.artifacts.redact !== undefined ? { redact: opts.artifacts.redact } : {}),
    })
    const filename = artifactFilenameForBenchmarkStep(opts.artifacts.runId, args.index, args.providerId)
    await writeCodingRunArtifactFile(opts.artifacts.outDir, filename, payload)
  }

  for (let i = 0; i < opts.providers.length; i += 1) {
    if (opts.signal?.aborted) {
      break
    }
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
        await persistArtifact({
          index: i,
          providerId: pid,
          worktreePath: undefined,
          cwdForWorktreeId: opts.repoRoot,
          taskId,
          phase: 'setup_failed',
          setupError: created.error,
        })
        continue
      }
      cwd = created.meta.path
      worktreePath = created.meta.path
    }

    const req = buildTask(opts.kind, opts.prompt, cwd, opts.dryRun, opts.timeoutMs ?? 120_000)

    let headBefore: string | undefined
    if (opts.artifacts !== undefined) {
      headBefore = await resolveHeadOidSafe(cwd)
    }

    const persistProviderRunBundle = async (
      phase: 'provider_completed' | 'provider_threw',
      taskResult: CodingTaskResult,
    ): Promise<void> => {
      if (opts.artifacts === undefined) {
        return
      }
      const git = await gitSnapshotAfterRun(cwd, headBefore)
      await persistArtifact({
        index: i,
        providerId: pid,
        worktreePath,
        cwdForWorktreeId: cwd,
        taskId,
        phase,
        taskRequest: req,
        taskResult,
        ...(git !== undefined ? { git } : {}),
      })
    }

    try {
      const result = await p.runTask(req)
      await persistProviderRunBundle('provider_completed', result)
      rows.push(rowFromResult(result, worktreePath))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const synthetic: CodingTaskResult = {
        providerId: pid,
        status: 'fail',
        files: [],
        shell: [],
        tools: [],
        summary: msg,
        errorCode: 'benchmark.run_threw',
      }
      await persistProviderRunBundle('provider_threw', synthetic)
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
