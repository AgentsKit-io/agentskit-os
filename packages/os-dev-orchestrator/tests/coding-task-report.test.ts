import { describe, expect, it } from 'vitest'
import type { CodingBenchmarkReport } from '../src/coding-benchmark.js'
import type { DelegationReport } from '../src/coding-delegation.js'
import {
  buildCodingTaskReportFromBenchmark,
  buildCodingTaskReportFromDelegation,
  renderCodingTaskReportMarkdown,
  toCodingTaskDashboardPayload,
} from '../src/coding-task-report.js'

const bench = (): CodingBenchmarkReport => ({
  kind: 'free-form',
  prompt: 'hello',
  dryRun: true,
  isolateWorktrees: false,
  repoRoot: '/repo',
  rows: [
    {
      providerId: 'codex',
      status: 'ok',
      durationMs: 100,
      inputTokens: 10,
      outputTokens: 20,
      costUsd: 0.01,
      fileEditCount: 1,
      completenessScore: 90,
      summary: 'ok',
      editedPaths: ['src/a.ts'],
    },
    {
      providerId: 'claude-code',
      status: 'fail',
      fileEditCount: 0,
      completenessScore: 0,
      summary: 'bad',
      errorCode: 'claude.bad_json',
    },
  ],
})

describe('buildCodingTaskReportFromBenchmark', () => {
  it('aggregates totals and classifies failures', () => {
    const r = buildCodingTaskReportFromBenchmark(bench(), {
      clock: () => '2026-05-05T12:00:00.000Z',
      links: { traceUrl: 'https://t/1' },
    })
    expect(r.meta.source).toBe('benchmark')
    expect(r.aggregate.providerCount).toBe(2)
    expect(r.aggregate.totalCostUsd).toBeCloseTo(0.01)
    expect(r.aggregate.totalInputTokens).toBe(10)
    expect(r.aggregate.failCount).toBe(1)
    expect(r.providers[1]?.failure?.code).toBe('invalid_diff')
    expect(r.diffSummary?.uniquePaths).toBe(1)
    expect(r.links.traceUrl).toBe('https://t/1')
  })
})

describe('toCodingTaskDashboardPayload', () => {
  it('flattens provider rows', () => {
    const r = buildCodingTaskReportFromBenchmark(bench(), { clock: () => 't' })
    const d = toCodingTaskDashboardPayload(r)
    expect(d.providers).toHaveLength(2)
    expect(d.providers[0]?.failureCode).toBeUndefined()
    expect(d.providers[1]?.failureCode).toBe('invalid_diff')
  })
})

describe('buildCodingTaskReportFromDelegation', () => {
  it('includes delegation section', () => {
    const delegation: DelegationReport = {
      coordinatorSummary: 'coord',
      subtasks: [
        {
          specId: 's1',
          providerId: 'codex',
          result: {
            providerId: 'codex',
            status: 'ok',
            files: [{ path: 'a.ts', op: 'modify', after: 'x' }],
            shell: [],
            tools: [],
            summary: 'y',
          },
        },
      ],
      conflicts: [{ path: 'a.ts', providers: ['codex', 'gemini'] }],
      trace: { id: 'root', kind: 'coordinator', detail: 'x' },
      suggestHumanInbox: true,
    }
    const r = buildCodingTaskReportFromDelegation(
      delegation,
      {
        kind: 'edit',
        prompt: 'coord',
        dryRun: true,
        repoRoot: '/r',
        isolateWorktrees: true,
      },
      { clock: () => 't' },
    )
    expect(r.meta.source).toBe('delegation')
    expect(r.delegation?.conflicts).toHaveLength(1)
    expect(renderCodingTaskReportMarkdown(r)).toContain('Path conflicts')
  })
})
