import { describe, expect, it } from 'vitest'
import type { CodingAgentProvider, CodingTaskResult } from '@agentskit/os-core'
import { runIssueToPrPipeline, simulateIssueToPrDryRun } from '../src/issue-pr-pipeline.js'

const fakeProvider = (id: string, result: CodingTaskResult): CodingAgentProvider => ({
  info: { id, displayName: id, capabilities: ['edit_files'], invocation: 'subprocess' },
  isAvailable: async () => true,
  runTask: async () => result,
})

describe('simulateIssueToPrDryRun', () => {
  it('returns ordered phases for dry-run trace (#364)', () => {
    const r = simulateIssueToPrDryRun({
      issueRef: 'https://github.com/org/repo/issues/42',
      repoRoot: '/tmp/repo',
      providers: ['codex', 'claude-code'],
    })
    expect(r.dryRun).toBe(true)
    expect(r.templateId).toBe('dev-issue-to-pr')
    expect(r.providersPlanned).toEqual(['codex', 'claude-code'])
    expect(r.events.map((e) => e.phase)).toContain('github.issue.fetch')
    expect(r.events.map((e) => e.phase)).toContain('github.pr.open-draft')
    expect(r.planSummary).toContain('Dry-run plan')
    expect(r.prDraft.title).toContain('Draft')
    expect(r.prDraft.baseBranch).toBe('main')
    expect(r.diffPreview).toContain('dry-run')
    expect(r.reviewSummary.length).toBeGreaterThan(10)
  })
})

describe('runIssueToPrPipeline', () => {
  it('returns the dry-run report when mode=dry-run (#364)', async () => {
    const r = await runIssueToPrPipeline({
      issueRef: '#42',
      repoRoot: '/r',
      mode: 'dry-run',
      providers: ['codex'],
    })
    expect(r.dryRun).toBe(true)
    if (r.dryRun) {
      expect(r.providersPlanned).toEqual(['codex'])
    }
  })

  it('runs a single provider in live mode and exposes plan + benchmark (#364)', async () => {
    const provider = fakeProvider('codex', {
      providerId: 'codex',
      status: 'ok',
      files: [{ path: 'a.ts', op: 'modify', after: 'x' }],
      shell: [],
      tools: [],
      summary: 'done',
    })
    const r = await runIssueToPrPipeline({
      issueRef: '#42',
      repoRoot: '/r',
      mode: 'live',
      provider,
    })
    expect(r.dryRun).toBe(false)
    if (!r.dryRun) {
      expect(r.benchmark.rows).toHaveLength(1)
      expect(r.benchmark.rows[0]?.providerId).toBe('codex')
      expect(r.plan.providersPlanned).toEqual(['codex'])
      expect(r.prDraft.headBranch).toContain('agentskit/issue-')
    }
  })

  it('throws when live mode invoked without a provider (#364)', async () => {
    await expect(
      runIssueToPrPipeline({ issueRef: '#1', repoRoot: '/r', mode: 'live' }),
    ).rejects.toThrow(/requires a CodingAgentProvider/)
  })
})
