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

  it('propagates permission profile and expectedArtifacts into subtask rows (#365)', async () => {
    const report = await runDelegatedCodingTask({
      repoRoot: '/repo',
      coordinatorPrompt: 'meta',
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
            summary: 'ok',
          }),
          prompt: 'x',
          kind: 'free-form',
          dryRun: true,
          permissionProfileId: 'read_only_review',
          expectedArtifacts: ['diff', 'tests'],
        },
      ],
    })
    expect(report.subtasks[0]?.permissionProfileId).toBe('read_only_review')
    expect(report.subtasks[0]?.expectedArtifacts).toEqual(['diff', 'tests'])
  })
})
