import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CodingAgentProvider, CodingTaskResult } from '@agentskit/os-core'
import { runDelegatedCodingTask } from '../src/coding-delegation.js'

const fake = (id: string, result: CodingTaskResult): CodingAgentProvider => ({
  info: { id, displayName: id, capabilities: ['edit_files'], invocation: 'subprocess' },
  isAvailable: async () => true,
  runTask: async () => result,
})

describe('runDelegatedCodingTask', () => {
  it('detects overlapping file paths as conflicts', async () => {
    const report = await runDelegatedCodingTask({
      repoRoot: '/repo',
      coordinatorPrompt: 'merge ui',
      isolateWorktrees: false,
      shards: [
        {
          id: 'a',
          providerId: 'p-a',
          provider: fake('p-a', {
            providerId: 'p-a',
            status: 'ok',
            files: [{ path: 'src/x.ts', op: 'modify', after: 'a' }],
            shell: [],
            tools: [],
            summary: 'a',
          }),
          prompt: 'x',
          kind: 'free-form',
          dryRun: true,
        },
        {
          id: 'b',
          providerId: 'p-b',
          provider: fake('p-b', {
            providerId: 'p-b',
            status: 'ok',
            files: [{ path: 'src/x.ts', op: 'modify', after: 'b' }],
            shell: [],
            tools: [],
            summary: 'b',
          }),
          prompt: 'y',
          kind: 'free-form',
          dryRun: true,
        },
      ],
    })

    expect(report.conflicts).toHaveLength(1)
    expect(report.conflicts[0]?.path).toBe('src/x.ts')
    expect(report.suggestHumanInbox).toBe(true)
    expect(report.trace.kind).toBe('coordinator')
  })

  it('does not flag conflicts when files are disjoint', async () => {
    const report = await runDelegatedCodingTask({
      repoRoot: '/repo',
      coordinatorPrompt: 'ok',
      isolateWorktrees: false,
      shards: [
        {
          id: 'a',
          providerId: 'p-a',
          provider: fake('p-a', {
            providerId: 'p-a',
            status: 'ok',
            files: [{ path: 'a.ts', op: 'modify', after: '1' }],
            shell: [],
            tools: [],
            summary: '',
          }),
          prompt: 'x',
          kind: 'free-form',
          dryRun: true,
        },
        {
          id: 'b',
          providerId: 'p-b',
          provider: fake('p-b', {
            providerId: 'p-b',
            status: 'ok',
            files: [{ path: 'b.ts', op: 'modify', after: '2' }],
            shell: [],
            tools: [],
            summary: '',
          }),
          prompt: 'y',
          kind: 'free-form',
          dryRun: true,
        },
      ],
    })
    expect(report.conflicts).toHaveLength(0)
    expect(report.suggestHumanInbox).toBe(false)
  })

  it('runs dry-run shards in parallel on the same repo root (#365)', async () => {
    const report = await runDelegatedCodingTask({
      repoRoot: '/repo',
      coordinatorPrompt: 'parallel smoke',
      isolateWorktrees: false,
      parallel: true,
      shards: [
        {
          id: 'a',
          providerId: 'p-a',
          provider: fake('p-a', {
            providerId: 'p-a',
            status: 'ok',
            files: [],
            shell: [],
            tools: [],
            summary: 'a',
          }),
          prompt: 'x',
          kind: 'free-form',
          dryRun: true,
        },
        {
          id: 'b',
          providerId: 'p-b',
          provider: fake('p-b', {
            providerId: 'p-b',
            status: 'ok',
            files: [],
            shell: [],
            tools: [],
            summary: 'b',
          }),
          prompt: 'y',
          kind: 'free-form',
          dryRun: true,
        },
      ],
    })
    expect(report.subtasks).toHaveLength(2)
    expect(report.coordinatorSummary).toContain('parallel: true')
  })

  it('writes per-shard delegation run artifacts when artifacts opts are set (#367)', async () => {
    const artDir = mkdtempSync(join(tmpdir(), 'ak-deleg-art-'))
    try {
      await runDelegatedCodingTask({
        repoRoot: '/repo',
        coordinatorPrompt: 'coord',
        isolateWorktrees: false,
        artifacts: { outDir: artDir, runId: 'deleg-run-1' },
        shards: [
          {
            id: 'a',
            providerId: 'p-a',
            provider: fake('p-a', {
              providerId: 'p-a',
              status: 'ok',
              files: [],
              shell: [],
              tools: [],
              summary: 'a',
            }),
            prompt: 'x',
            kind: 'free-form',
            dryRun: true,
          },
          {
            id: 'b',
            providerId: 'p-b',
            provider: fake('p-b', {
              providerId: 'p-b',
              status: 'ok',
              files: [],
              shell: [],
              tools: [],
              summary: 'b',
            }),
            prompt: 'y',
            kind: 'free-form',
            dryRun: true,
          },
        ],
      })
      const files = readdirSync(artDir).filter((f) => f.startsWith('coding-run-artifact-deleg-'))
      expect(files.length).toBe(2)
      const parsed = files.map(
        (f) => JSON.parse(readFileSync(join(artDir, f), 'utf8')) as { benchmarkIndex: number },
      )
      expect(parsed.map((x) => x.benchmarkIndex).sort()).toEqual([0, 1])
    } finally {
      rmSync(artDir, { recursive: true, force: true })
    }
  })
})
