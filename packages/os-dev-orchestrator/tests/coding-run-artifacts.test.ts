import { describe, expect, it } from 'vitest'
import type { CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import {
  artifactFilenameForDelegationStep,
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

describe('buildCodingRunArtifactPayload failure classification', () => {
  it('attaches failure classification when result is a failure', () => {
    const res: CodingTaskResult = {
      providerId: 'codex',
      status: 'timeout',
      files: [],
      shell: [],
      tools: [],
      summary: 'timed out',
    }
    const payload = buildCodingRunArtifactPayload({
      ids: { runId: 'r', taskId: 't', providerId: 'codex' },
      benchmarkIndex: 0,
      phase: 'provider_completed',
      taskResult: res,
    })
    expect(payload.failure).not.toBeNull()
    expect(payload.failure?.code).toBe('provider_timeout')
  })

  it('attaches null failure for clean ok', () => {
    const res: CodingTaskResult = {
      providerId: 'codex',
      status: 'ok',
      files: [],
      shell: [],
      tools: [],
      summary: 'done',
    }
    const payload = buildCodingRunArtifactPayload({
      ids: { runId: 'r', taskId: 't', providerId: 'codex' },
      benchmarkIndex: 0,
      phase: 'provider_completed',
      taskResult: res,
    })
    expect(payload.failure).toBeNull()
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

describe('artifactFilenameForDelegationStep', () => {
  it('prefixes deleg and includes shard index', () => {
    const n = artifactFilenameForDelegationStep('run/x', 2, 'shard-0', 'codex')
    expect(n.startsWith('coding-run-artifact-deleg-')).toBe(true)
    expect(n).toContain('-2-')
    expect(n.endsWith('.json')).toBe(true)
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
