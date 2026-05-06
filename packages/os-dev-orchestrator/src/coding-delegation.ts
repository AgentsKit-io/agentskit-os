// Per #365 — multi-provider coding delegation (coordinator + merge signals).

import type { CodingAgentProvider, CodingTaskKind, CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import { createCodingAgentWorktreeManager, type CodingAgentWorktreeManager, type GitRunner } from './git-worktree-manager.js'
import {
  artifactFilenameForDelegationStep,
  buildCodingRunArtifactPayload,
  collectGitHeadDiffSnapshot,
  resolveHeadOidSafe,
  writeCodingRunArtifactFile,
  type CodingAgentArtifactIds,
  type CodingRunArtifactsOpts,
} from './coding-run-artifacts.js'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Local copy of profile ids (kept in sync with the permission profiles module when present).
export type CodingPermissionProfileId =
  | 'read_only_review'
  | 'edit_without_shell'
  | 'test_runner'
  | 'full_sandbox'
  | 'release_manager'

export type DelegationSubTaskSpec = {
  readonly id: string
  readonly providerId: string
  readonly provider: CodingAgentProvider
  readonly prompt: string
  readonly kind: CodingTaskKind
  readonly dryRun: boolean
  readonly permissionProfileId?: CodingPermissionProfileId
  /** Optional list of artifact ids the shard is expected to produce (#365). */
  readonly expectedArtifacts?: readonly string[]
}

export type DelegationSubTaskRow = {
  readonly specId: string
  readonly providerId: string
  readonly result: CodingTaskResult
  readonly worktreePath?: string
  readonly permissionProfileId?: CodingPermissionProfileId
  readonly expectedArtifacts?: readonly string[]
}

export type FileConflict = {
  readonly path: string
  readonly providers: readonly string[]
}

export type DelegationTraceNode = {
  readonly id: string
  readonly providerId?: string
  readonly kind: 'coordinator' | 'shard' | 'merge'
  readonly detail: string
  readonly children?: readonly DelegationTraceNode[]
}

export type DelegationReport = {
  readonly coordinatorSummary: string
  readonly subtasks: readonly DelegationSubTaskRow[]
  readonly conflicts: readonly FileConflict[]
  /** Graph for observability / human inbox (#337). */
  readonly trace: DelegationTraceNode
  readonly suggestHumanInbox: boolean
}

export type DelegationArtifactsOpts = CodingRunArtifactsOpts

const filePathKey = (f: { path: string }): string => f.path

const collectConflicts = (rows: readonly DelegationSubTaskRow[]): readonly FileConflict[] => {
  const byPath = new Map<string, Set<string>>()
  for (const row of rows) {
    const pid = row.result.providerId
    for (const file of row.result.files) {
      const k = filePathKey(file)
      let set = byPath.get(k)
      if (!set) {
        set = new Set()
        byPath.set(k, set)
      }
      set.add(pid)
    }
  }
  const out: FileConflict[] = []
  for (const [path, providers] of byPath) {
    if (providers.size > 1) {
      out.push({ path, providers: [...providers].sort() })
    }
  }
  return out
}

const buildTask = (
  kind: CodingTaskKind,
  prompt: string,
  cwd: string,
  dryRun: boolean,
): CodingTaskRequest => ({
  kind,
  prompt,
  cwd,
  readScope: ['**/*'],
  writeScope: dryRun ? [] : ['**/*'],
  granted: ['edit_files', 'run_shell', 'run_tests'],
  timeoutMs: 120_000,
  dryRun,
})

type PrepOk = {
  readonly ok: true
  readonly shard: DelegationSubTaskSpec
  readonly cwd: string
  readonly taskId?: string
  readonly worktreePath?: string
  readonly shardIndex: number
}

type PrepFail = {
  readonly ok: false
  readonly row: DelegationSubTaskRow
  readonly trace: DelegationTraceNode
  readonly shardIndex: number
}

type Prep = PrepOk | PrepFail

const persistDelegationArtifact = async (
  artifacts: CodingRunArtifactsOpts | undefined,
  args: {
    readonly shardIndex: number
    readonly specId: string
    readonly providerId: string
    readonly worktreeId?: string
    readonly cwd: string
    readonly headBefore?: string
    readonly phase: 'setup_failed' | 'provider_completed' | 'provider_threw'
    readonly setupError?: string
    readonly taskRequest?: CodingTaskRequest
    readonly taskResult?: CodingTaskResult
  },
): Promise<void> => {
  if (artifacts === undefined) return
  const { outDir, runId, traceId, redact } = artifacts
  const gitSnap = await collectGitHeadDiffSnapshot(args.cwd, args.headBefore)
  const ids: CodingAgentArtifactIds = {
    runId,
    taskId: `delegation:${args.shardIndex}:${args.specId}:${args.providerId}`,
    providerId: args.providerId,
    ...(args.worktreeId !== undefined ? { worktreeId: args.worktreeId } : {}),
    ...(traceId !== undefined ? { traceId } : {}),
  }
  const payload = buildCodingRunArtifactPayload({
    ids,
    benchmarkIndex: args.shardIndex,
    phase: args.phase,
    ...(args.setupError !== undefined ? { setupError: args.setupError } : {}),
    ...(args.taskRequest !== undefined ? { taskRequest: args.taskRequest } : {}),
    ...(args.taskResult !== undefined ? { taskResult: args.taskResult } : {}),
    ...(redact !== undefined ? { redact } : {}),
    ...(gitSnap !== undefined ? { git: gitSnap } : {}),
  })
  const name = artifactFilenameForDelegationStep(runId, args.shardIndex, args.specId, args.providerId)
  await writeCodingRunArtifactFile(outDir, name, payload)
}

const prepareShard = async (
  shard: DelegationSubTaskSpec,
  shardIndex: number,
  wm: CodingAgentWorktreeManager | undefined,
  repoRoot: string,
  artifacts: CodingRunArtifactsOpts | undefined,
): Promise<Prep> => {
  if (!wm) {
    return { ok: true, shard, cwd: repoRoot, shardIndex }
  }

  const basePath = await mkdtemp(join(tmpdir(), `ak-deleg-${shard.providerId}-`))
  const taskId = `deleg-${shard.id}-${Date.now()}`
  const created = await wm.createForTask({
    taskId,
    providerId: shard.providerId,
    path: basePath,
    branch: '',
    cleanupDefault: 'delete',
  })
  if (!created.ok) {
    await persistDelegationArtifact(artifacts, {
      shardIndex,
      specId: shard.id,
      providerId: shard.providerId,
      worktreeId: taskId,
      cwd: repoRoot,
      phase: 'setup_failed',
      setupError: created.error,
    })
    return {
      ok: false,
      shardIndex,
      row: {
        specId: shard.id,
        providerId: shard.providerId,
        result: {
          providerId: shard.providerId,
          status: 'fail',
          files: [],
          shell: [],
          tools: [],
          summary: created.error,
          errorCode: 'delegation.worktree_failed',
        },
      },
      trace: {
        id: shard.id,
        providerId: shard.providerId,
        kind: 'shard',
        detail: `worktree failed: ${created.error}`,
      },
    }
  }

  return {
    ok: true,
    shard,
    cwd: created.meta.path,
    taskId,
    worktreePath: created.meta.path,
    shardIndex,
  }
}

type ShardExec = { readonly row: DelegationSubTaskRow; readonly trace: DelegationTraceNode }

const execPrepared = async (
  p: PrepOk,
  wm: CodingAgentWorktreeManager | undefined,
  artifacts: CodingRunArtifactsOpts | undefined,
): Promise<ShardExec> => {
  const { shard, cwd, taskId, worktreePath, shardIndex } = p
  const req = buildTask(shard.kind, shard.prompt, cwd, shard.dryRun)
  const headBefore = await resolveHeadOidSafe(cwd)
  let result: CodingTaskResult
  try {
    result = await shard.provider.runTask(req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result = {
      providerId: shard.providerId,
      status: 'fail',
      files: [],
      shell: [],
      tools: [],
      summary: msg,
      errorCode: 'delegation.run_threw',
    }
  }

  const phase: 'provider_completed' | 'provider_threw' =
    result.errorCode === 'delegation.run_threw' ? 'provider_threw' : 'provider_completed'
  await persistDelegationArtifact(artifacts, {
    shardIndex,
    specId: shard.id,
    providerId: shard.providerId,
    ...(taskId !== undefined ? { worktreeId: taskId } : {}),
    cwd,
    ...(headBefore !== undefined ? { headBefore } : {}),
    phase,
    taskRequest: req,
    taskResult: result,
    ...(phase === 'provider_threw' ? { setupError: result.summary } : {}),
  })

  if (wm && taskId) {
    await wm.finalize(taskId, 'delete').catch(() => {})
  }

  let row: DelegationSubTaskRow = {
    specId: shard.id,
    providerId: shard.providerId,
    result,
    ...(shard.permissionProfileId !== undefined ? { permissionProfileId: shard.permissionProfileId } : {}),
    ...(shard.expectedArtifacts !== undefined ? { expectedArtifacts: shard.expectedArtifacts } : {}),
  }
  if (worktreePath !== undefined) {
    row = { ...row, worktreePath }
  }

  const trace: DelegationTraceNode = {
    id: shard.id,
    providerId: shard.providerId,
    kind: 'shard',
    detail: (() => {
      const f = shard.permissionProfileId ? ` perm=${shard.permissionProfileId}` : ''
      return `${result.status}${f}: ${result.summary.slice(0, 120)}`
    })(),
  }
  return { row, trace }
}

const shardOrder = (shards: readonly DelegationSubTaskSpec[], rows: readonly ShardExec[]): ShardExec[] => {
  const idx = new Map(shards.map((s, i) => [s.id, i] as const))
  return [...rows].sort((a, b) => {
    const ai = idx.get(a.row.specId)
    const bi = idx.get(b.row.specId)
    const aIdx = ai !== undefined ? ai : 0
    const bIdx = bi !== undefined ? bi : 0
    return aIdx - bIdx
  })
}

/**
 * Run delegated shards with optional git worktree per shard (#365).
 * When `parallel` is true, shard tasks run concurrently after worktrees are prepared
 * (requires `isolateWorktrees` or all shards `dryRun`).
 */
export const runDelegatedCodingTask = async (opts: {
  readonly repoRoot: string
  readonly coordinatorPrompt: string
  readonly shards: readonly DelegationSubTaskSpec[]
  readonly isolateWorktrees: boolean
  readonly parallel?: boolean
  readonly gitRunner?: GitRunner
  readonly artifacts?: DelegationArtifactsOpts
  readonly signal?: AbortSignal
}): Promise<DelegationReport> => {
  opts.signal?.throwIfAborted()

  const parallel = opts.parallel === true
  if (parallel && !opts.isolateWorktrees && opts.shards.some((s) => !s.dryRun)) {
    throw new Error(
      'runDelegatedCodingTask: parallel=true requires isolateWorktrees=true unless every shard uses dryRun',
    )
  }

  const artifacts = opts.artifacts

  let wm: CodingAgentWorktreeManager | undefined
  if (opts.isolateWorktrees) {
    if (opts.gitRunner !== undefined) {
      wm = createCodingAgentWorktreeManager({ repoRoot: opts.repoRoot, runner: opts.gitRunner })
    } else {
      wm = createCodingAgentWorktreeManager({ repoRoot: opts.repoRoot })
    }
  }

  const shardTraceNodes: DelegationTraceNode[] = []
  const subRows: DelegationSubTaskRow[] = []

  const preps: Prep[] = []
  for (let i = 0; i < opts.shards.length; i += 1) {
    opts.signal?.throwIfAborted()
    const shard = opts.shards[i]!
    preps.push(await prepareShard(shard, i, wm, opts.repoRoot, artifacts))
  }

  for (const p of preps) {
    if (!p.ok) {
      subRows.push(p.row)
      shardTraceNodes.push(p.trace)
    }
  }

  const oks = preps.filter((p): p is PrepOk => p.ok)
  let execs: ShardExec[]
  if (parallel) {
    execs = shardOrder(opts.shards, await Promise.all(oks.map((p) => execPrepared(p, wm, artifacts))))
  } else {
    execs = []
    for (const p of oks) {
      opts.signal?.throwIfAborted()
      execs.push(await execPrepared(p, wm, artifacts))
    }
  }

  for (const e of execs) {
    subRows.push(e.row)
    shardTraceNodes.push(e.trace)
  }

  const conflicts = collectConflicts(subRows)
  const mergeNode: DelegationTraceNode = {
    id: 'merge',
    kind: 'merge',
    detail:
      conflicts.length > 0
        ? `conflicts on ${conflicts.length} path(s) — route to human inbox`
        : 'no overlapping file edits between shards',
    children: conflicts.map((c) => ({
      id: `c:${c.path}`,
      kind: 'merge' as const,
      detail: `${c.path} ← ${c.providers.join(', ')}`,
    })),
  }

  const trace: DelegationTraceNode = {
    id: 'coord',
    kind: 'coordinator',
    detail: `${opts.coordinatorPrompt.slice(0, 200)}${parallel ? ' [parallel]' : ''}`,
    children: [...shardTraceNodes, mergeNode],
  }

  const suggestHumanInbox = conflicts.length > 0 || subRows.some((r) => r.result.status === 'fail')

  const coordinatorSummary = [
    `shards: ${opts.shards.length}`,
    `parallel: ${parallel}`,
    `conflicts: ${conflicts.length}`,
    suggestHumanInbox ? 'human review recommended' : 'clean merge signal',
  ].join(' · ')

  return {
    coordinatorSummary,
    subtasks: subRows,
    conflicts,
    trace,
    suggestHumanInbox,
  }
}
