import { parseDomainPack, type DomainPack } from '@agentskit/os-core'

export const agencyPack: DomainPack = parseDomainPack({
  schemaVersion: 1,
  domain: 'agency',
  name: 'Agency workflows',
  description: '3-way marketing review, brand-voice consistency, deliverable QA.',
  suites: [
    {
      schemaVersion: 1,
      id: 'brand-voice-baseline',
      name: 'Brand voice baseline',
      evals: [
        {
          id: 'voice-consistency',
          name: 'Brand voice consistency',
          domain: 'agency',
          criteria: [
            {
              kind: 'llm_judge',
              rubric: 'Score 0-1 how well output matches the brand kit voice tone.',
              judgeModel: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
              passThreshold: 0.75,
            },
          ],
          tags: ['brand', 'voice'],
        },
        {
          id: 'forbidden-claims',
          name: 'No forbidden claims',
          domain: 'agency',
          criteria: [
            {
              kind: 'golden_set',
              fixturesPath: 'evals/agency/forbidden-claims.jsonl',
              comparator: 'contains',
              passRate: 1.0,
            },
          ],
          tags: ['compliance'],
        },
      ],
    },
  ],
})
