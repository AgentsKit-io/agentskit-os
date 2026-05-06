import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { explainRun } from '../src/commands/explain-run.js'

const writeArtifact = async (
  dir: string,
  filename: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  await writeFile(join(dir, filename), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

describe('explainRun (#224)', () => {
  it('renders an ordered step list from coding-run-artifact files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-explain-'))
    try {
      await writeArtifact(dir, 'coding-run-artifact-r1-0-codex.json', {
        ids: { runId: 'r1', providerId: 'codex' },
        phase: 'provider_completed',
        capturedAt: '2026-05-06T12:00:00Z',
        benchmarkIndex: 0,
        taskResult: {
          summary: 'edited login form',
          status: 'ok',
          files: [{ path: 'src/login.ts' }, { path: 'src/login.test.ts' }],
        },
      })
      await writeArtifact(dir, 'coding-run-artifact-r1-1-claude_code-cancelled.json', {
        ids: { runId: 'r1', providerId: 'claude-code' },
        phase: 'run_cancelled',
        capturedAt: '2026-05-06T12:00:05Z',
        benchmarkIndex: 1,
        setupError: 'aborted before provider start',
      })
      const exit = await explainRun.run(['--artifact-dir', dir])
      expect(exit.code).toBe(0)
      expect(exit.stdout).toContain('2 step(s):')
      expect(exit.stdout).toContain('codex')
      expect(exit.stdout).toContain('provider completed successfully')
      expect(exit.stdout).toContain('claude-code')
      expect(exit.stdout).toContain('run cancelled before this provider started')
      expect(exit.stdout).toContain('paths: src/login.ts, src/login.test.ts')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('emits structured JSON with --json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-explain-json-'))
    try {
      await writeArtifact(dir, 'coding-run-artifact-r1-0-codex.json', {
        ids: { runId: 'r1', providerId: 'codex' },
        phase: 'provider_completed',
        benchmarkIndex: 0,
        taskResult: { summary: 'ok', status: 'ok', files: [] },
      })
      const exit = await explainRun.run(['--artifact-dir', dir, '--json'])
      expect(exit.code).toBe(0)
      const parsed = JSON.parse(exit.stdout) as Array<{ providerId: string }>
      expect(parsed).toHaveLength(1)
      expect(parsed[0]?.providerId).toBe('codex')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('exits 1 when no artifacts match the runId filter', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-explain-empty-'))
    try {
      await writeArtifact(dir, 'coding-run-artifact-r1-0-codex.json', {
        ids: { runId: 'r1', providerId: 'codex' },
        phase: 'provider_completed',
        benchmarkIndex: 0,
        taskResult: { summary: 'ok', status: 'ok', files: [] },
      })
      const exit = await explainRun.run(['--artifact-dir', dir, '--run-id', 'r-nope'])
      expect(exit.code).toBe(1)
      expect(exit.stdout).toContain('no coding-run-artifact')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
