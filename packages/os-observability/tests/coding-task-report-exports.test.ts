import { describe, expect, it } from 'vitest'
import { renderCodingTaskReportMarkdown, toCodingTaskDashboardPayload } from '../src/coding-task-report-exports.js'
import type { CodingTaskReport } from '@agentskit/os-dev-orchestrator'

const minimalReport = (): CodingTaskReport => ({
  meta: { schemaVersion: '1.0', generatedAt: '2026-05-06T00:00:00.000Z', source: 'benchmark' },
  task: {
    kind: 'free-form',
    prompt: 'x',
    dryRun: true,
    repoRoot: '/r',
    isolateWorktrees: false,
  },
  aggregate: {
    providerCount: 1,
    okCount: 1,
    partialCount: 0,
    failCount: 0,
    timeoutCount: 0,
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalDurationMs: 0,
  },
  providers: [
    {
      providerId: 'codex',
      status: 'ok',
      fileEditCount: 0,
      completenessScore: 100,
      summary: 'ok',
      editedPaths: [],
      failure: null,
      tests: { commandsObserved: [], anyFailed: false, assumedTestsRan: false },
    },
  ],
  links: {},
})

describe('@agentskit/os-observability/coding-task-report', () => {
  it('re-exports report markdown + dashboard helpers (#368)', () => {
    const r = minimalReport()
    expect(renderCodingTaskReportMarkdown(r)).toContain('Coding task report')
    const dash = toCodingTaskDashboardPayload(r)
    expect(dash.schemaVersion).toBe('1.0')
    expect(dash.providers).toHaveLength(1)
  })
})
