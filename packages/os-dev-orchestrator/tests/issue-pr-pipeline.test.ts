import { describe, expect, it } from 'vitest'
import { simulateIssueToPrDryRun } from '../src/issue-pr-pipeline.js'

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
