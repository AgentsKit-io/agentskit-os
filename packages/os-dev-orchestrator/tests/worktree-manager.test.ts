import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCodingAgentWorktreeManager,
  createDevOrchestratorWorktreeManager,
  type GitRunner,
} from '../src/index.js'

describe('createDevOrchestratorWorktreeManager', () => {
  it('add: runs git worktree add -b', async () => {
    const calls: string[][] = []
    const runner: GitRunner = async ({ args }) => {
      calls.push([...args])
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    const m = createDevOrchestratorWorktreeManager({ repoRoot: '/repo', runner })
    const r = await m.add({ path: '/repo/.agentskitos/worktrees/foo', branch: 'agentskit/foo' })

    expect(r).toEqual({ ok: true })
    expect(calls[0]?.slice(0, 5)).toEqual(['worktree', 'add', '-b', 'agentskit/foo', '/repo/.agentskitos/worktrees/foo'])
  })

  it('rejects paths with traversal segments', async () => {
    const m = createDevOrchestratorWorktreeManager({ repoRoot: '/repo' })
    const r = await m.add({ path: '/repo/../nope', branch: 'x' })
    expect(r.ok).toBe(false)
  })
})

describe('createCodingAgentWorktreeManager', () => {
  it('auto-generates collision-safe branch names for parallel tasks', async () => {
    const calls: string[][] = []
    const runner: GitRunner = async ({ args }) => {
      calls.push([...args])
      return { exitCode: 0, stdout: '', stderr: '' }
    }
    const m = createCodingAgentWorktreeManager({ repoRoot: '/repo', runner })
    const a = await m.createForTask({
      taskId: 'same',
      providerId: 'codex',
      path: '/repo/.agentskitos/worktrees/a',
      branch: '',
    })
    const b = await m.createForTask({
      taskId: 'same',
      providerId: 'codex',
      path: '/repo/.agentskitos/worktrees/b',
      branch: '',
    })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.meta.branch).not.toBe(b.meta.branch)
      expect(a.meta.branch).toMatch(/^agentskit\/codex-same(-\d+)?$/)
      expect(b.meta.branch).toMatch(/^agentskit\/codex-same-\d+$/)
    }
    expect(calls[0]?.[4]).not.toBe(calls[1]?.[4])
  })

  it('finalize delete removes worktree and drops metadata', async () => {
    const runner: GitRunner = async ({ args }) => ({ exitCode: 0, stdout: '', stderr: '' })
    const m = createCodingAgentWorktreeManager({ repoRoot: '/repo', runner })
    const created = await m.createForTask({
      taskId: 't1',
      providerId: 'claude-code',
      path: '/repo/.agentskitos/worktrees/t1',
      branch: 'agentskit/manual',
    })
    expect(created.ok).toBe(true)
    const fin = await m.finalize('t1', 'delete')
    expect(fin.ok).toBe(true)
    expect(m.getMeta('t1')).toBeUndefined()
  })

  it('finalize archive attempts git worktree move', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'akos-wt-archive-'))
    try {
      const runner: GitRunner = async ({ args }) => {
        if (args[0] === 'worktree' && args[1] === 'move') {
          return { exitCode: 0, stdout: '', stderr: '' }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      }
      const m = createCodingAgentWorktreeManager({ repoRoot: repo, runner })
      await m.createForTask({
        taskId: 'arch',
        providerId: 'codex',
        path: join(repo, 'wt-arch'),
        branch: 'b-arch',
      })
      const fin = await m.finalize('arch', 'archive')
      expect(fin.ok).toBe(true)
      expect(m.getMeta('arch')).toBeUndefined()
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })
})
