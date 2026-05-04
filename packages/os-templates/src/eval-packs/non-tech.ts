import { parseDomainPack, type DomainPack } from '@agentskit/os-core'

export const nonTechPack: DomainPack = parseDomainPack({
  schemaVersion: 1,
  domain: 'non-tech',
  name: 'Non-technical operator workflows',
  description: 'Support triage, reading-level checks, escalation accuracy.',
  suites: [
    {
      schemaVersion: 1,
      id: 'triage-baseline',
      name: 'Support triage baseline',
      evals: [
        {
          id: 'reading-level',
          name: 'Output reading level',
          domain: 'non-tech',
          criteria: [
            {
              kind: 'threshold',
              metric: 'flesch_kincaid_grade',
              operator: '<=',
              target: 8,
            },
          ],
          tags: ['readability'],
        },
        {
          id: 'escalation-routing',
          name: 'Escalates to human when needed',
          domain: 'non-tech',
          criteria: [
            {
              kind: 'golden_set',
              fixturesPath: 'evals/non-tech/escalations.jsonl',
              comparator: 'contains',
              passRate: 0.95,
            },
          ],
          tags: ['escalation'],
        },
      ],
    },
  ],
})
