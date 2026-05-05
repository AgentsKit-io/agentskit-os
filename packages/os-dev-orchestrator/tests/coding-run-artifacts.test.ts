import { describe, expect, it } from 'vitest'
import type { CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import {
  buildCodingRunArtifactPayload,
  redactCodingTaskResult,
  summarizeGitDiffForArtifact,
} from '../src/coding-run-artifacts.js'

describe('buildCodingRunArtifactPayload', () => {
  it('includes ids, phase, and redacts nested strings when redact is set', () => {
    const req: CodingTaskRequest = {
      kind: 'free-form',
      prompt: 'secret-token-abc fix it',
      cwd: '/r',
      readScope: ['**/*'],
      writeScope: [],
      granted: ['edit_files'],
      timeoutMs: 1,
      dryRun: true,
    }
    const res: CodingTaskResult = {
      providerId: 'p',
      status: 'ok',
      files: [{ path: 'a.ts', op: 'modify', after: 'secret-token-abc' }],
      shell: [{ command: 'echo secret-token-abc', exitCode: 0, stdout: 'x', stderr: '' }],
      tools: [],
      summary: 'done secret-token-abc',
    }
    const payload = buildCodingRunArtifactPayload({
      ids: {
        runId: 'run-1',
        taskId: 't1',
        providerId: 'p',
        worktreeId: '/w',
        traceId: 'tr',
      },
      benchmarkIndex: 0,
      phase: 'provider_completed',
      taskRequest: req,
      taskResult: res,
      redact: (s) => s.replaceAll('secret-token-abc', '[REDACTED]'),
    })
    expect(payload.schemaVersion).toBe('1.0')
    expect(payload.phase).toBe('provider_completed')
    expect(payload.taskRequest?.prompt).toContain('[REDACTED]')
    expect(payload.taskRequest?.prompt).not.toContain('secret-token-abc')
    expect(payload.taskResult?.summary).toContain('[REDACTED]')
    expect(payload.taskResult?.files[0]?.after).toBe('[REDACTED]')
    expect(payload.taskResult?.shell[0]?.command).toContain('[REDACTED]')
  })
})

describe('redactCodingTaskResult', () => {
  it('is a no-op when redact is omitted', () => {
    const res: CodingTaskResult = {
      providerId: 'p',
      status: 'fail',
      files: [],
      shell: [],
      tools: [],
      summary: 'x',
    }
    expect(redactCodingTaskResult(res)).toEqual(res)
  })
})

describe('summarizeGitDiffForArtifact', () => {
  it('aggregates paths and hunk counts', () => {
    const summary = summarizeGitDiffForArtifact({
      repoRoot: '/r',
      from: 'a',
      to: 'b',
      files: [
        { path: 'f1', hunks: [{ header: '@@', lines: ['a'] }] },
        { path: 'f2', hunks: [{ header: '@@', lines: ['b'] }, { header: '@@2', lines: ['c'] }] },
      ],
    })
    expect(summary.paths).toEqual(['f1', 'f2'])
    expect(summary.hunkCount).toBe(3)
    expect(summary.from).toBe('a')
    expect(summary.to).toBe('b')
  })
})
