import { readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('applies caller-supplied rubricScore + successChecks (#366)', async () => {
    const p = fakeProvider('p', async () => ({
      providerId: 'p',
      status: 'ok' as const,
      files: [{ path: 'a.ts', op: 'modify' as const, after: 'x' }],
      shell: [],
      tools: [],
      summary: 'done',
    }))
    const report = await runCodingAgentBenchmark({
      repoRoot: '/r',
      providers: [p],
      kind: 'free-form',
      prompt: 'x',
      dryRun: true,
      isolateWorktrees: false,
      config: {
        rubricScore: () => 42,
        successChecks: (row) => row.fileEditCount >= 1,
      },
    })
    expect(report.rows[0]?.completenessScore).toBe(42)
    expect(report.rows[0]?.successPassed).toBe(true)
  })

  it('clamps rubricScore overrides into 0..100 (#366)', async () => {
    const p = fakeProvider('p', async () => ({
      providerId: 'p',
      status: 'ok' as const,
      files: [],
      shell: [],
      tools: [],
      summary: '',
    }))
    const report = await runCodingAgentBenchmark({
      repoRoot: '/r',
      providers: [p],
      kind: 'free-form',
      prompt: 'x',
      dryRun: true,
      isolateWorktrees: false,
      config: { rubricScore: () => 9999 },
    })
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

  it('writes per-provider artifact files when artifacts opt is set', async () => {
    const outDir = join(tmpdir(), `ak-bench-art-${Date.now()}`)
    const p1 = fakeProvider('p-one', async ({ cwd }) => ({
      providerId: 'p-one',
      status: 'ok' as const,
      files: [],
      shell: [],
      tools: [],
      summary: 'done',
    }))
    try {
      const report = await runCodingAgentBenchmark({
        repoRoot: '/tmp/repo',
        providers: [p1],
        kind: 'free-form',
        prompt: 'hello',
        dryRun: true,
        isolateWorktrees: false,
        artifacts: { outDir, runId: 'run-test-1', traceId: 'trace-z' },
      })
      expect(report.rows).toHaveLength(1)
      const names = await readdir(outDir)
      expect(names.length).toBe(1)
      const completed = JSON.parse(
        await readFile(join(outDir, names[0]!), 'utf8'),
      ) as { phase: string; ids: { traceId?: string }; git?: unknown }
      expect(completed.phase).toBe('provider_completed')
      expect(completed.ids.traceId).toBe('trace-z')
      expect(completed.git).toBeUndefined()
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })

  it('stops before remaining providers when signal is aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const calls: string[] = []
    const p1 = fakeProvider('p-one', async () => {
      calls.push('one')
      return {
        providerId: 'p-one',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: '',
      }
    })
    const p2 = fakeProvider('p-two', async () => {
      calls.push('two')
      return {
        providerId: 'p-two',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: '',
      }
    })
    const report = await runCodingAgentBenchmark({
      repoRoot: '/r',
      providers: [p1, p2],
      kind: 'free-form',
      prompt: 'x',
      dryRun: true,
      isolateWorktrees: false,
      signal: ctrl.signal,
    })
    expect(report.rows).toHaveLength(0)
    expect(calls).toHaveLength(0)
  })

  it('does not run later providers when aborted after an earlier provider finishes', async () => {
    const ctrl = new AbortController()
    const p1 = fakeProvider('p-one', async () => {
      ctrl.abort()
      return {
        providerId: 'p-one',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: '',
      }
    })
    const p2 = fakeProvider('p-two', async () => {
      return {
        providerId: 'p-two',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: '',
      }
    })
    const report = await runCodingAgentBenchmark({
      repoRoot: '/r',
      providers: [p1, p2],
      kind: 'free-form',
      prompt: 'x',
      dryRun: true,
      isolateWorktrees: false,
      signal: ctrl.signal,
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.providerId).toBe('p-one')
  })

  it('records provider_threw artifact phase when runTask throws', async () => {
    const outDir = join(tmpdir(), `ak-bench-art-throw-${Date.now()}`)
    const bad = fakeProvider('bad', async () => {
      throw new Error('boom')
    })
    try {
      await runCodingAgentBenchmark({
        repoRoot: '/r',
        providers: [bad],
        kind: 'free-form',
        prompt: 'x',
        dryRun: true,
        isolateWorktrees: false,
        artifacts: { outDir, runId: 'run-throw' },
      })
      const names = await readdir(outDir)
      expect(names.length).toBe(1)
      const threw = JSON.parse(
        await readFile(join(outDir, names[0]!), 'utf8'),
      ) as { phase: string; taskResult?: { errorCode?: string } }
      expect(threw.phase).toBe('provider_threw')
      expect(threw.taskResult?.errorCode).toBe('benchmark.run_threw')
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })

  it('writes run_cancelled artifact when aborted after a provider with capture enabled', async () => {
    const outDir = join(tmpdir(), `ak-bench-cancel-${Date.now()}`)
    const ctrl = new AbortController()
    const p1 = fakeProvider('p-one', async () => {
      ctrl.abort()
      return {
        providerId: 'p-one',
        status: 'ok' as const,
        files: [],
        shell: [],
        tools: [],
        summary: '',
      }
    })
    const p2 = fakeProvider('p-two', async () => ({
      providerId: 'p-two',
      status: 'ok' as const,
      files: [],
      shell: [],
      tools: [],
      summary: '',
    }))
    try {
      await runCodingAgentBenchmark({
        repoRoot: '/r',
        providers: [p1, p2],
        kind: 'free-form',
        prompt: 'x',
        dryRun: true,
        isolateWorktrees: false,
        signal: ctrl.signal,
        artifacts: { outDir, runId: 'run-cancel-art' },
      })
      const names = await readdir(outDir)
      const cancelName = names.find((n) => n.includes('-cancelled'))
      expect(cancelName).toBeDefined()
      const cancel = JSON.parse(await readFile(join(outDir, cancelName!), 'utf8')) as { phase: string }
      expect(cancel.phase).toBe('run_cancelled')
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })
})
