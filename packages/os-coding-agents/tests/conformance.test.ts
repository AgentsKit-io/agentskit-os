import { describe, expect, it } from 'vitest'
import { runConformance } from '@agentskit/os-core'
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

describe('os-coding-agents adapters', () => {
  it('codex: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/codex',
      run: async () => ({
        exitCode: 0,
        stdout: JSON.stringify({
          status: 'ok',
          summary: 'ok',
          files: [{ path: 'allowed/x.ts', op: 'create', after: 'hi' }],
          shell: [],
          tools: [],
          costUsd: 0,
          inputTokens: 1,
          outputTokens: 1,
          durationMs: 1,
        }),
        stderr: '',
      }),
    })

    const p = createCodexProvider({ runner })
    const report = await runConformance(p)
    expect(report.certified).toBe(true)
  })

  it('claude-code: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/claude',
      run: async () => ({
        exitCode: 0,
        stdout: JSON.stringify({
          status: 'ok',
          summary: 'ok',
          files: [{ path: 'allowed/x.ts', op: 'create', after: 'hi' }],
          shell: [],
          tools: [],
          costUsd: 0,
          inputTokens: 1,
          outputTokens: 1,
          durationMs: 1,
        }),
        stderr: '',
      }),
    })

    const p = createClaudeCodeProvider({ runner })
    const report = await runConformance(p)
    expect(report.certified).toBe(true)
  })

  const jsonOk = (): string =>
    JSON.stringify({
      status: 'ok',
      summary: 'ok',
      files: [{ path: 'allowed/x.ts', op: 'create', after: 'hi' }],
      shell: [],
      tools: [],
      costUsd: 0,
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 1,
    })

  it('cursor: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/cursor-agent',
      run: async () => ({ exitCode: 0, stdout: jsonOk(), stderr: '' }),
    })
    const report = await runConformance(createCursorProvider({ runner }))
    expect(report.certified).toBe(true)
  })

  it('gemini: passes conformance with json stdout', async () => {
    const runner = mockRunner({
      which: async () => '/bin/gemini',
      run: async () => ({ exitCode: 0, stdout: jsonOk(), stderr: '' }),
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
