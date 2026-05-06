import { describe, expect, it } from 'vitest'
import {
  DEV_TRIGGER_PRESETS,
  getDevTriggerPreset,
  listDevTriggerPresets,
} from '../src/dev-trigger-presets.js'

describe('DEV_TRIGGER_PRESETS', () => {
  it('covers slack, discord, teams, cron, pr, issue, and webhook', () => {
    const kinds = new Set(DEV_TRIGGER_PRESETS.map((p) => p.kind))
    for (const k of ['slack', 'discord', 'teams', 'cron', 'github_pr', 'github_issue', 'webhook']) {
      expect(kinds.has(k as never)).toBe(true)
    }
  })

  it('every preset declares mapping, auth, profile, and pipeline', () => {
    for (const p of listDevTriggerPresets()) {
      expect(p.id.length).toBeGreaterThan(0)
      expect(p.targetPipeline.length).toBeGreaterThan(0)
      expect(p.defaultPermissionProfile.length).toBeGreaterThan(0)
      expect(p.authExpectations.length).toBeGreaterThan(0)
      const req = p.mapPayload({ payload: p.examplePayload, repoRoot: '/repo' })
      expect(req.cwd).toBe('/repo')
      expect(req.prompt.length).toBeGreaterThan(0)
    }
  })

  it('slack preset extracts text into prompt', () => {
    const p = getDevTriggerPreset('dev/slack-message')
    expect(p).toBeDefined()
    const req = p!.mapPayload({ payload: { text: 'fix bug X' }, repoRoot: '/repo' })
    expect(req.prompt).toBe('fix bug X')
    expect(req.granted).toContain('edit_files')
  })

  it('github pr preset defaults to dry-run review', () => {
    const p = getDevTriggerPreset('dev/github-pr-opened')!
    const req = p.mapPayload({
      payload: { pull_request: { title: 'feat: x', body: 'desc' } },
      repoRoot: '/repo',
    })
    expect(req.dryRun).toBe(true)
    expect(req.writeScope).toEqual([])
  })

  it('cron dependency preset sets multi_provider mode and narrows write scope', () => {
    const p = getDevTriggerPreset('dev/cron-dependency-update')!
    expect(p.defaultRunMode).toBe('multi_provider')
    const req = p.mapPayload({ payload: {}, repoRoot: '/repo' })
    expect(req.writeScope.some((g) => g.includes('package.json'))).toBe(true)
  })

  it('issue preset routes to issue-to-pr pipeline', () => {
    const p = getDevTriggerPreset('dev/github-issue-opened')!
    expect(p.targetPipeline).toContain('issue-to-pr')
    const req = p.mapPayload({
      payload: { issue: { title: 'flaky test', body: 'logs here' } },
      repoRoot: '/repo',
    })
    expect(req.prompt).toContain('flaky test')
  })

  it('respects defaults override', () => {
    const p = getDevTriggerPreset('dev/generic-webhook')!
    const req = p.mapPayload({
      payload: { prompt: 'go' },
      repoRoot: '/repo',
      defaults: { timeoutMs: 30_000, dryRun: true },
    })
    expect(req.timeoutMs).toBe(30_000)
    expect(req.dryRun).toBe(true)
  })
})
