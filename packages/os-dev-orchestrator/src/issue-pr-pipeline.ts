// Per #364 — headless dry-run trace for issue → PR pipeline (no git remotes).

export type IssueToPrPipelineEvent = {
  readonly phase: string
  readonly detail: string
  readonly at: string
}

export type IssueToPrPrDraftMeta = {
  readonly title: string
  readonly body: string
  readonly baseBranch: string
  readonly headBranch: string
}

export type IssueToPrDryRunReport = {
  readonly schemaVersion: 1
  readonly issueRef: string
  readonly repoRoot: string
  readonly dryRun: true
  readonly templateId: 'dev-issue-to-pr'
  readonly events: readonly IssueToPrPipelineEvent[]
  readonly providersPlanned: readonly string[]
  /** Planning step output (stub in dry-run). */
  readonly planSummary: string
  /** Aggregated provider log lines (stub in dry-run). */
  readonly providerLogPreview: string
  /** Unified diff preview (stub in dry-run). */
  readonly diffPreview: string
  /** Test / lint output preview (stub in dry-run). */
  readonly testLogPreview: string
  /** Review summary before HITL (stub in dry-run). */
  readonly reviewSummary: string
  /** PR draft metadata (no remote push in dry-run). */
  readonly prDraft: IssueToPrPrDraftMeta
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
  const slug = opts.issueRef.replace(/[^a-zA-Z0-9._#/-]+/g, '-').slice(0, 64)
  const headBranch = `agentskit/issue-${slug}`
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

  const planSummary = [
    'Dry-run plan (no GitHub API):',
    `- Scope issue ${opts.issueRef} against ${opts.repoRoot}`,
    `- Implement with providers: ${providers.join(', ')}`,
    '- Run tests, summarize review, open draft PR after HITL',
  ].join('\n')

  const providerLogPreview = [
    `[${providers[0] ?? 'codex'}] dry-run: would run implement step in worktree`,
    '[orchestrator] tokens/cost would stream to observability in live mode',
  ].join('\n')

  const diffPreview = [
    '--- a/example.ts',
    '+++ b/example.ts',
    '@@ dry-run unified diff placeholder — no working tree mutations in simulateIssueToPrDryRun @@',
  ].join('\n')

  const testLogPreview = 'pnpm test (dry-run) — no subprocess executed'

  const reviewSummary =
    'Review: changes address linked issue; tests not executed in dry-run; human approval required before draft PR.'

  const prDraft: IssueToPrPrDraftMeta = {
    title: `[bot] Draft: ${opts.issueRef}`,
    body: `Automated draft from AgentsKitOS issue→PR pipeline (dry-run).\n\nRefs: ${opts.issueRef}\nProviders: ${providers.join(', ')}`,
    baseBranch: 'main',
    headBranch,
  }

  return {
    schemaVersion: 1,
    issueRef: opts.issueRef,
    repoRoot: opts.repoRoot,
    dryRun: true,
    templateId: 'dev-issue-to-pr',
    events,
    providersPlanned: providers,
    planSummary,
    providerLogPreview,
    diffPreview,
    testLogPreview,
    reviewSummary,
    prDraft,
  }
}
