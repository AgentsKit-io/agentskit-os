import { describe, expect, it } from 'vitest'
import { CONFORMANCE_PROMPTS, runConformance } from '@agentskit/os-core'
import { createClaudeCodeProvider, createCodexProvider, createCursorProvider, createGeminiProvider } from '../src/index.js'
import {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
} from '../src/builtin.js'
import type { RunFn, SubprocessRunner, WhichFn } from '../src/subprocess.js'

const mockRunner = (handlers: {
  readonly which: WhichFn
  readonly run: RunFn
}): SubprocessRunner => ({
  which: handlers.which,
  run: handlers.run,
})

/** JSON stdout for `runConformance` — mirrors fake provider in `os-core` `coding-agent.test` (#374). */
const conformanceJsonForStdin = (stdin: string | undefined): string => {
  const s = stdin ?? ''
  const mk = (r: Record<string, unknown>) => JSON.stringify(r)
  const base = (extra: Record<string, unknown>) =>
    mk({
      status: 'ok',
      summary: 'conformance stub',
      files: [],
      shell: [],
      tools: [],
      costUsd: 0,
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 2,
      ...extra,
    })

  if (s.includes(CONFORMANCE_PROMPTS.expectNoDiff)) {
    return base({ files: [], summary: 'no changes' })
  }
  if (s.includes(CONFORMANCE_PROMPTS.expectFailingTests)) {
    return mk({
      status: 'fail',
      summary: 'tests failed',
      errorCode: 'tests.failed',
      files: [],
      shell: [{ command: 'pnpm test', exitCode: 1, stdout: '', stderr: '1 failed' }],
      tools: [],
      costUsd: 0,
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 3,
    })
  }
  if (s.includes(CONFORMANCE_PROMPTS.expectPermissionDenied)) {
    return mk({
      status: 'fail',
      summary: 'denied',
      errorCode: 'os.permission_denied',
      files: [],
      shell: [],
      tools: [],
      costUsd: 0,
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 2,
    })
  }
  if (s.includes(CONFORMANCE_PROMPTS.expectArtifacts)) {
    return base({
      tools: [{ tool: 'artifacts.collect', args: '{}', ok: true }],
    })
  }
  if (s.includes(CONFORMANCE_PROMPTS.expectTimeout)) {
    return mk({
      status: 'timeout',
      summary: 'timed out',
      files: [],
      shell: [],
      tools: [],
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 800,
    })
  }
  if (s.includes(CONFORMANCE_PROMPTS.expectFastOk)) {
    return base({ durationMs: 50 })
  }
  if (s.includes('CONFORMANCE: pretend to create /etc/forbidden')) {
    return base({
      files: [{ path: 'allowed/x.ts', op: 'create', after: '// hi' }],
      shell: [],
    })
  }
  return base({})
}

/** Codex uses `stdin`; Claude/Cursor/Gemini embed the task in `-p <prompt>` args. */
const conformanceProbeText = (opts: { readonly args: readonly string[]; readonly stdin?: string }): string | undefined => {
  const pIdx = opts.args.indexOf('-p')
  if (pIdx >= 0 && opts.args[pIdx + 1]) return String(opts.args[pIdx + 1])
  return opts.stdin
}

const conformanceMockRun: RunFn = async (opts) => {
  if (opts.args.includes('--version')) {
    return { exitCode: 0, stdout: '9.9.9\n', stderr: '' }
  }
  return {
    exitCode: 0,
    stdout: conformanceJsonForStdin(conformanceProbeText(opts)),
    stderr: '',
  }
}

describe('os-coding-agents adapters', () => {
  it('codex: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/codex',
      run: conformanceMockRun,
    })

    const p = createCodexProvider({ runner })
    const report = await runConformance(p)
    expect(report.certified).toBe(true)
  })

  it('claude-code: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/claude',
      run: conformanceMockRun,
    })

    const p = createClaudeCodeProvider({ runner })
    const report = await runConformance(p)
    expect(report.certified).toBe(true)
  })

  it('cursor: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/cursor-agent',
      run: conformanceMockRun,
    })
    const report = await runConformance(createCursorProvider({ runner }))
    expect(report.certified).toBe(true)
  })

  it('gemini: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/gemini',
      run: conformanceMockRun,
    })
    const report = await runConformance(createGeminiProvider({ runner }))
    expect(report.certified).toBe(true)
  })

  it('builtin factory returns all ids', () => {
    expect(BUILTIN_CODING_AGENT_IDS.length).toBe(4)
    for (const id of BUILTIN_CODING_AGENT_IDS) {
      expect(createBuiltinCodingAgentProvider(id).info.id).toBe(id)
    }
  })
})
