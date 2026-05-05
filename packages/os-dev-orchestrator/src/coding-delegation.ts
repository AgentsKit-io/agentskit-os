// Per #365 — multi-provider coding delegation (coordinator + merge signals).

import type { CodingAgentProvider, CodingTaskKind, CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import { createCodingAgentWorktreeManager, type CodingAgentWorktreeManager, type GitRunner } from './git-worktree-manager.js'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type DelegationSubTaskSpec = {
  readonly id: string
  readonly providerId: string
  readonly provider: CodingAgentProvider
  readonly prompt: string
  readonly kind: CodingTaskKind
  readonly dryRun: boolean
}

export type DelegationSubTaskRow = {
  readonly specId: string
  readonly providerId: string
  readonly result: CodingTaskResult
  readonly worktreePath?: string
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
}

type PrepFail = {
  readonly ok: false
  readonly row: DelegationSubTaskRow
  readonly trace: DelegationTraceNode
}

type Prep = PrepOk | PrepFail

const prepareShard = async (
  shard: DelegationSubTaskSpec,
  wm: CodingAgentWorktreeManager | undefined,
  repoRoot: string,
): Promise<Prep> => {
  if (!wm) {
    return { ok: true, shard, cwd: repoRoot }
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
    return {
      ok: false,
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
  }
}

type ShardExec = { readonly row: DelegationSubTaskRow; readonly trace: DelegationTraceNode }

const execPrepared = async (
  p: PrepOk,
  wm: CodingAgentWorktreeManager | undefined,
): Promise<ShardExec> => {
  const { shard, cwd, taskId, worktreePath } = p
  const req = buildTask(shard.kind, shard.prompt, cwd, shard.dryRun)
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
  } finally {
    if (wm && taskId) {
      await wm.finalize(taskId, 'delete').catch(() => {})
    }
  }

  const row: DelegationSubTaskRow =
    worktreePath !== undefined
      ? { specId: shard.id, providerId: shard.providerId, result, worktreePath }
      : { specId: shard.id, providerId: shard.providerId, result }

  const trace: DelegationTraceNode = {
    id: shard.id,
    providerId: shard.providerId,
    kind: 'shard',
    detail: `${result.status}: ${result.summary.slice(0, 120)}`,
  }
  return { row, trace }
}

const shardOrder = (shards: readonly DelegationSubTaskSpec[], rows: readonly ShardExec[]): ShardExec[] => {
  const idx = new Map(shards.map((s, i) => [s.id, i] as const))
  return [...rows].sort((a, b) => (idx.get(a.row.specId) ?? 0) - (idx.get(b.row.specId) ?? 0))
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
}): Promise<DelegationReport> => {
  const parallel = opts.parallel === true
  if (parallel && !opts.isolateWorktrees && opts.shards.some((s) => !s.dryRun)) {
    throw new Error(
      'runDelegatedCodingTask: parallel=true requires isolateWorktrees=true unless every shard uses dryRun',
    )
  }

  const wm = opts.isolateWorktrees
    ? createCodingAgentWorktreeManager(
        opts.gitRunner !== undefined
          ? { repoRoot: opts.repoRoot, runner: opts.gitRunner }
          : { repoRoot: opts.repoRoot },
      )
    : undefined

  const shardTraceNodes: DelegationTraceNode[] = []
  const subRows: DelegationSubTaskRow[] = []

  const preps: Prep[] = []
  for (const shard of opts.shards) {
    preps.push(await prepareShard(shard, wm, opts.repoRoot))
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
    execs = shardOrder(opts.shards, await Promise.all(oks.map((p) => execPrepared(p, wm))))
  } else {
    execs = []
    for (const p of oks) {
      execs.push(await execPrepared(p, wm))
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
