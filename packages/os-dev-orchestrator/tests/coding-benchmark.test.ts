import { describe, expect, it } from 'vitest'
import type { CodingAgentProvider, CodingTaskResult } from '@agentskit/os-core'
import { computeCompletenessScore, runCodingAgentBenchmark } from '../src/coding-benchmark.js'

const fakeProvider = (
  id: string,
  impl: (req: { cwd: string }) => Promise<CodingTaskResult>,
): CodingAgentProvider => ({
  info: {
    id,
    displayName: id,
    capabilities: ['edit_files'],
    invocation: 'subprocess',
  },
  isAvailable: async () => true,
  runTask: (req) => impl(req),
})

describe('computeCompletenessScore', () => {
  it('scores ok higher than partial', () => {
    const ok: CodingTaskResult = {
      providerId: 'a',
      status: 'ok',
      files: [],
      shell: [],
      tools: [],
      summary: '',
    }
    const partial: CodingTaskResult = { ...ok, status: 'partial' }
    expect(computeCompletenessScore(ok)).toBeGreaterThan(computeCompletenessScore(partial))
  })

  it('penalizes many file edits', () => {
    const few: CodingTaskResult = {
      providerId: 'a',
      status: 'ok',
      files: [{ path: 'a.ts', op: 'modify', after: 'x' }],
      shell: [],
      tools: [],
      summary: '',
    }
    const many: CodingTaskResult = {
      ...few,
      files: Array.from({ length: 20 }, (_, i) => ({
        path: `f${i}.ts`,
        op: 'modify' as const,
        after: 'x',
      })),
    }
    expect(computeCompletenessScore(many)).toBeLessThan(computeCompletenessScore(few))
  })
})

describe('runCodingAgentBenchmark', () => {
  it('runs providers sequentially without worktrees', async () => {
    const calls: string[] = []
    const p1 = fakeProvider('p-one', async ({ cwd }) => {
      calls.push(`1:${cwd}`)
      return {
        providerId: 'p-one',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: 'done',
        durationMs: 1,
      }
    })
    const p2 = fakeProvider('p-two', async ({ cwd }) => {
      calls.push(`2:${cwd}`)
      return {
        providerId: 'p-two',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: 'done',
        durationMs: 2,
      }
    })

    const report = await runCodingAgentBenchmark({
      repoRoot: '/tmp/repo',
      providers: [p1, p2],
      kind: 'free-form',
      prompt: 'hello',
      dryRun: true,
      isolateWorktrees: false,
    })

    expect(report.rows).toHaveLength(2)
    expect(report.rows[0]?.providerId).toBe('p-one')
    expect(report.rows[1]?.providerId).toBe('p-two')
    expect(calls).toEqual(['1:/tmp/repo', '2:/tmp/repo'])
    expect(report.rows[0]?.completenessScore).toBe(100)
  })

  it('records failures when provider throws', async () => {
    const bad = fakeProvider('bad', async () => {
      throw new Error('boom')
    })
    const report = await runCodingAgentBenchmark({
      repoRoot: '/r',
      providers: [bad],
      kind: 'free-form',
      prompt: 'x',
      dryRun: true,
      isolateWorktrees: false,
    })
    expect(report.rows[0]?.status).toBe('fail')
    expect(report.rows[0]?.errorCode).toBe('benchmark.run_threw')
    expect(report.rows[0]?.summary).toContain('boom')
  })
})
