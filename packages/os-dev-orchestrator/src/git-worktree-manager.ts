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
  // prevent obvious traversal; callers should still prefer absolute paths
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
