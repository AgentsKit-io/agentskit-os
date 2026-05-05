// Per #364 — headless dry-run trace for issue → PR pipeline (no git remotes).

export type IssueToPrPipelineEvent = {
  readonly phase: string
  readonly detail: string
  readonly at: string
}

export type IssueToPrDryRunReport = {
  readonly schemaVersion: 1
  readonly issueRef: string
  readonly repoRoot: string
  readonly dryRun: true
  readonly templateId: 'dev-issue-to-pr'
  readonly events: readonly IssueToPrPipelineEvent[]
  readonly providersPlanned: readonly string[]
}

/**
 * Produce a deterministic trace for the `dev-issue-to-pr` template without
 * calling GitHub remotes or real coding-agent CLIs (#364 dry-run AC).
 */
export const simulateIssueToPrDryRun = (opts: {
  readonly issueRef: string
  readonly repoRoot: string
  readonly providers?: readonly string[]
}): IssueToPrDryRunReport => {
  const now = () => new Date().toISOString()
  const providers = opts.providers?.length ? [...opts.providers] : ['codex']
  const events: IssueToPrPipelineEvent[] = [
    { phase: 'github.issue.fetch', detail: `resolved ${opts.issueRef}`, at: now() },
    { phase: 'coding-agent.plan', detail: 'plan stub (dry-run)', at: now() },
    { phase: 'git.worktree.prepare', detail: `repo ${opts.repoRoot}`, at: now() },
    { phase: 'coding-agent.implement', detail: `providers: ${providers.join(', ')}`, at: now() },
    { phase: 'test.runner.run', detail: 'tests stub (dry-run)', at: now() },
    { phase: 'coding-agent.summarize', detail: 'review summary stub', at: now() },
    { phase: 'human.hitl', detail: 'await maintainer approval (simulated)', at: now() },
    { phase: 'github.pr.open-draft', detail: 'no remote push in dry-run', at: now() },
  ]

  return {
    schemaVersion: 1,
    issueRef: opts.issueRef,
    repoRoot: opts.repoRoot,
    dryRun: true,
    templateId: 'dev-issue-to-pr',
    events,
    providersPlanned: providers,
  }
}
