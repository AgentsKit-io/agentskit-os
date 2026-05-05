// Per #365 — multi-provider coding delegation (coordinator + merge signals).

import type { CodingAgentProvider, CodingTaskKind, CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import { createCodingAgentWorktreeManager, type GitRunner } from './git-worktree-manager.js'
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

/**
 * Run delegated shards sequentially with optional git worktree per shard (#365).
 * Merge step compares edited file paths; overlaps set `suggestHumanInbox` for operator review.
 */
export const runDelegatedCodingTask = async (opts: {
  readonly repoRoot: string
  readonly coordinatorPrompt: string
  readonly shards: readonly DelegationSubTaskSpec[]
  readonly isolateWorktrees: boolean
  readonly gitRunner?: GitRunner
}): Promise<DelegationReport> => {
  const wm = opts.isolateWorktrees
    ? createCodingAgentWorktreeManager(
        opts.gitRunner !== undefined
          ? { repoRoot: opts.repoRoot, runner: opts.gitRunner }
          : { repoRoot: opts.repoRoot },
      )
    : undefined

  const shardTraceNodes: DelegationTraceNode[] = []
  const subRows: DelegationSubTaskRow[] = []

  for (const shard of opts.shards) {
    let cwd = opts.repoRoot
    let worktreePath: string | undefined
    let taskId: string | undefined

    if (wm) {
      const basePath = await mkdtemp(join(tmpdir(), `ak-deleg-${shard.providerId}-`))
      taskId = `deleg-${shard.id}-${Date.now()}`
      const created = await wm.createForTask({
        taskId,
        providerId: shard.providerId,
        path: basePath,
        branch: '',
        cleanupDefault: 'delete',
      })
      if (!created.ok) {
        subRows.push({
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
        })
        shardTraceNodes.push({
          id: shard.id,
          providerId: shard.providerId,
          kind: 'shard',
          detail: `worktree failed: ${created.error}`,
        })
        continue
      }
      cwd = created.meta.path
      worktreePath = created.meta.path
    }

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

    subRows.push(
      worktreePath !== undefined
        ? { specId: shard.id, providerId: shard.providerId, result, worktreePath }
        : { specId: shard.id, providerId: shard.providerId, result },
    )
    shardTraceNodes.push({
      id: shard.id,
      providerId: shard.providerId,
      kind: 'shard',
      detail: `${result.status}: ${result.summary.slice(0, 120)}`,
    })
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
    detail: opts.coordinatorPrompt.slice(0, 240),
    children: [...shardTraceNodes, mergeNode],
  }

  const suggestHumanInbox = conflicts.length > 0 || subRows.some((r) => r.result.status === 'fail')

  const coordinatorSummary = [
    `shards: ${opts.shards.length}`,
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
