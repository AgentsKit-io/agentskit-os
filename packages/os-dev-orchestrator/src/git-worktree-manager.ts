import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

export type GitRunResult = {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

export type GitRunner = (opts: {
  readonly repoRoot: string
  readonly args: readonly string[]
  readonly timeoutMs: number
}) => Promise<GitRunResult>

export const defaultGitRunner: GitRunner = async ({ repoRoot, args, timeoutMs }) =>
  new Promise((resolve) => {
    const child = spawn('git', [...args], {
      cwd: repoRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout?.on('data', (d) => { stdout += String(d) })
    child.stderr?.on('data', (d) => { stderr += String(d) })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        exitCode: 127,
        stdout,
        stderr: stderr || (err instanceof Error ? err.message : String(err)),
      })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })
  })

const assertSafeFsPath = (p: string): void => {
  if (!p || p.includes('\0')) throw new Error('invalid path')
  const norm = p.replaceAll('\\', '/')
  if (norm.split('/').some((seg) => seg === '..')) throw new Error('path must not contain ".." segments')
}

export type WorktreeAddInput = {
  /** Absolute path to new worktree directory. */
  readonly path: string
  /** Branch to create/check out inside the worktree. */
  readonly branch: string
  /**
   * Optional start point for `git worktree add -b` (commit-ish).
   * When omitted, defaults to whatever `git worktree add` picks (usually HEAD).
   */
  readonly startPoint?: string
}

export type DevOrchestratorWorktreeManager = {
  readonly add: (input: WorktreeAddInput) => Promise<{ ok: true } | { ok: false; error: string }>
  readonly remove: (path: string) => Promise<{ ok: true } | { ok: false; error: string }>
}

export const createDevOrchestratorWorktreeManager = (opts: {
  readonly repoRoot: string
  readonly runner?: GitRunner
  readonly timeoutMs?: number
}): DevOrchestratorWorktreeManager => {
  const runner = opts.runner ?? defaultGitRunner
  const timeoutMs = opts.timeoutMs ?? 30_000
  const repoRoot = opts.repoRoot

  return {
    add: async (input) => {
      try {
        assertSafeFsPath(input.path)
        assertSafeFsPath(input.branch)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      const args = [
        'worktree',
        'add',
        '-b',
        input.branch,
        input.path,
        ...(input.startPoint ? [input.startPoint] : []),
      ]

      const r = await runner({ repoRoot, args, timeoutMs })
      if (r.exitCode !== 0) {
        return { ok: false, error: r.stderr.trim() || `git worktree add failed (exit ${r.exitCode})` }
      }
      return { ok: true }
    },

    remove: async (path) => {
      try {
        assertSafeFsPath(path)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      const r = await runner({
        repoRoot,
        args: ['worktree', 'remove', '--force', path],
        timeoutMs,
      })
      if (r.exitCode !== 0) {
        return { ok: false, error: r.stderr.trim() || `git worktree remove failed (exit ${r.exitCode})` }
      }
      return { ok: true }
    },
  }
}

export type WorktreeCleanupOutcome = 'preserve' | 'archive' | 'delete'

export type WorktreeTaskMeta = {
  readonly taskId: string
  readonly providerId: string
  readonly branch: string
  readonly baseRef?: string
  readonly path: string
  readonly cleanupDefault: WorktreeCleanupOutcome
  readonly changedFiles: readonly string[]
  readonly createdAtMs: number
}

export type CodingAgentWorktreeCreateInput = {
  readonly taskId: string
  readonly providerId: string
  readonly path: string
  readonly branch: string
  readonly baseRef?: string
  readonly cleanupDefault?: WorktreeCleanupOutcome
  readonly changedFiles?: readonly string[]
}

export type CodingAgentWorktreeManager = DevOrchestratorWorktreeManager & {
  readonly createForTask: (
    input: CodingAgentWorktreeCreateInput,
  ) => Promise<{ ok: true; meta: WorktreeTaskMeta } | { ok: false; error: string }>
  readonly finalize: (
    taskId: string,
    outcome: WorktreeCleanupOutcome,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  readonly getMeta: (taskId: string) => WorktreeTaskMeta | undefined
  readonly listTasks: () => readonly WorktreeTaskMeta[]
}

const sanitizeId = (s: string): string =>
  s.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'task'

/**
 * Git worktree manager for coding-agent runs: task-scoped metadata, collision-safe
 * branch naming helpers, and post-review cleanup (`preserve` | `archive` | `delete`).
 */
export const createCodingAgentWorktreeManager = (opts: {
  readonly repoRoot: string
  readonly runner?: GitRunner
  readonly timeoutMs?: number
}): CodingAgentWorktreeManager => {
  const base = createDevOrchestratorWorktreeManager(opts)
  const runner = opts.runner ?? defaultGitRunner
  const timeoutMs = opts.timeoutMs ?? 30_000
  const repoRoot = opts.repoRoot
  const tasks = new Map<string, WorktreeTaskMeta>()
  const usedBranches = new Set<string>()

  const uniqueBranch = (providerId: string, taskId: string): string => {
    const p = sanitizeId(providerId)
    const t = sanitizeId(taskId)
    let n = 0
    let b = `agentskit/${p}-${t}`
    while (usedBranches.has(b)) {
      n += 1
      b = `agentskit/${p}-${t}-${n}`
    }
    usedBranches.add(b)
    return b
  }

  return {
    ...base,
    createForTask: async (input) => {
      const branch =
        input.branch.trim().length > 0
          ? input.branch.trim()
          : uniqueBranch(input.providerId, input.taskId)
      const add = await base.add({
        path: input.path,
        branch,
        ...(input.baseRef !== undefined ? { startPoint: input.baseRef } : {}),
      })
      if (!add.ok) return add
      usedBranches.add(branch)

      const cleanupDefault = input.cleanupDefault ?? 'delete'
      const meta: WorktreeTaskMeta = {
        taskId: input.taskId,
        providerId: input.providerId,
        branch,
        ...(input.baseRef !== undefined ? { baseRef: input.baseRef } : {}),
        path: input.path,
        cleanupDefault,
        changedFiles: input.changedFiles ?? [],
        createdAtMs: Date.now(),
      }
      tasks.set(input.taskId, meta)
      return { ok: true, meta }
    },

    finalize: async (taskId, outcome) => {
      const meta = tasks.get(taskId)
      if (!meta) return { ok: false, error: `unknown task id: ${taskId}` }

      if (outcome === 'preserve') {
        return { ok: true }
      }

      if (outcome === 'archive') {
        const destDir = join(repoRoot, '.agentskitos', 'worktrees', 'archive')
        try {
          await mkdir(destDir, { recursive: true })
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
        const destPath = join(destDir, sanitizeId(taskId))
        const mv = await runner({
          repoRoot,
          args: ['worktree', 'move', meta.path, destPath],
          timeoutMs,
        })
        if (mv.exitCode !== 0) {
          const rm = await base.remove(meta.path)
          if (!rm.ok) return rm
        }
        usedBranches.delete(meta.branch)
        tasks.delete(taskId)
        return { ok: true }
      }

      const rm = await base.remove(meta.path)
      if (!rm.ok) return rm
      usedBranches.delete(meta.branch)
      tasks.delete(taskId)
      return { ok: true }
    },

    getMeta: (taskId) => tasks.get(taskId),
    listTasks: () => [...tasks.values()],
  }
}
