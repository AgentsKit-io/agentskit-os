import { describe, expect, it } from 'vitest'
import { createDevOrchestratorWorktreeManager, type GitRunner } from '../src/index.js'

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
