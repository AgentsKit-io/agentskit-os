import { parseDomainPack, type DomainPack } from '@agentskit/os-core'

export const devPack: DomainPack = parseDomainPack({
  schemaVersion: 1,
  domain: 'dev',
  name: 'Developer workflows',
  description: 'PR review, code generation, refactor evals.',
  suites: [
    {
      schemaVersion: 1,
      id: 'pr-review-baseline',
      name: 'PR review baseline',
      evals: [
        {
          id: 'pr-summary-quality',
          name: 'PR summary quality',
          domain: 'dev',
          criteria: [
            {
              kind: 'llm_judge',
              rubric: 'Score 0-1 how well the summary captures intent, scope, and risk.',
              judgeModel: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
              passThreshold: 0.7,
            },
          ],
          tags: ['pr', 'summarization'],
        },
        {
          id: 'pr-blocker-detection',
          name: 'PR blocker detection',
          domain: 'dev',
          criteria: [
            {
              kind: 'golden_set',
              fixturesPath: 'evals/dev/pr-blockers.jsonl',
              comparator: 'contains',
              passRate: 0.85,
            },
          ],
          tags: ['pr', 'detection'],
        },
        {
          id: 'pr-latency',
          name: 'PR review latency',
          domain: 'dev',
          criteria: [
            {
              kind: 'threshold',
              metric: 'latency_ms_p95',
              operator: '<=',
              target: 30_000,
            },
          ],
          tags: ['perf'],
        },
      ],
    },
  ],
})
