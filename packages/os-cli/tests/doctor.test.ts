import { describe, expect, it } from 'vitest'
import { createDoctor, runDoctor } from '../src/commands/doctor.js'
import type { DoctorLlmAdapter, DoctorSandboxSpawner } from '../src/commands/doctor.js'

// ---------------------------------------------------------------------------
// Fake adapters
// ---------------------------------------------------------------------------

const makeFakeLlm = (overrides?: Partial<{ text: string; finishReason: string; delayMs: number }>): DoctorLlmAdapter => ({
  invoke: async () => {
    if (overrides?.delayMs) {
      await new Promise((r) => setTimeout(r, overrides.delayMs))
    }
    return {
      text: overrides?.text ?? 'pong',
      finishReason: overrides?.finishReason ?? 'stop',
    }
  },
})

const makeFakeSandbox = (overrides?: Partial<{ exitCode: number; delayMs: number; throwOnSpawn?: boolean }>): DoctorSandboxSpawner => ({
  spawn: async () => {
    if (overrides?.throwOnSpawn) throw new Error('spawn failed')
    if (overrides?.delayMs) {
      await new Promise((r) => setTimeout(r, overrides.delayMs))
    }
    return {
      pid: 1234,
      exitCode: Promise.resolve(overrides?.exitCode ?? 0),
    }
  },
})

// ---------------------------------------------------------------------------
// Tests — without --live
// ---------------------------------------------------------------------------

describe('doctor (no --live)', () => {
  it('runs and prints status table', async () => {
    const cmd = createDoctor()
    const r = await cmd.run([])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('node')
    expect(r.stdout).toContain('platform')
    expect(r.stdout).toContain('@agentskit/os-core')
    expect(r.stdout).toContain('all checks passed')
  })

  it('shows help on --help', async () => {
    const cmd = createDoctor()
    const r = await cmd.run(['--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os doctor')
  })

  it('does not include liveChecks in report when --live is absent', async () => {
    const report = await runDoctor(false)
    expect(report.liveChecks).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests — with --live, LLM probe
// ---------------------------------------------------------------------------

describe('doctor --live (LLM probe)', () => {
  it('returns llm:ok on successful probe', async () => {
    const report = await runDoctor(true, {
      llmAdapter: makeFakeLlm({ text: 'pong', finishReason: 'stop' }),
    })
    expect(report.liveChecks?.llm).toBe('ok')
    expect(report.liveChecks?.llmDetail).toContain('finishReason=stop')
  })

  it('returns llm:fail on timeout', async () => {
    const report = await runDoctor(true, {
      llmAdapter: makeFakeLlm({ delayMs: 200 }),
      timeoutMs: { llm: 50 },
    })
    expect(report.liveChecks?.llm).toBe('fail')
    expect(report.liveChecks?.llmDetail).toBe('os.cli.doctor_live_timeout')
  })

  it('returns llm:fail when adapter throws', async () => {
    const failingAdapter: DoctorLlmAdapter = {
      invoke: async () => { throw new Error('network error') },
    }
    const report = await runDoctor(true, { llmAdapter: failingAdapter })
    expect(report.liveChecks?.llm).toBe('fail')
    expect(report.liveChecks?.llmDetail).toContain('network error')
  })

  it('returns llm:skipped when no adapter injected', async () => {
    const report = await runDoctor(true, {})
    expect(report.liveChecks?.llm).toBe('skipped')
  })

  it('CLI output contains live:llm line', async () => {
    const cmd = createDoctor({ llmAdapter: makeFakeLlm() })
    const r = await cmd.run(['--live'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('live:llm')
    expect(r.stdout).toContain('finishReason=stop')
  })

  it('exits 1 when LLM probe fails', async () => {
    const failingAdapter: DoctorLlmAdapter = {
      invoke: async () => { throw new Error('boom') },
    }
    const cmd = createDoctor({ llmAdapter: failingAdapter })
    const r = await cmd.run(['--live'])
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('[FAIL]')
    expect(r.stderr).toContain('live:llm')
  })
})

// ---------------------------------------------------------------------------
// Tests — with --live, sandbox probe
// ---------------------------------------------------------------------------

describe('doctor --live (sandbox probe)', () => {
  it('returns sandbox:ok on exit code 0', async () => {
    const report = await runDoctor(true, {
      sandboxSpawner: makeFakeSandbox({ exitCode: 0 }),
    })
    expect(report.liveChecks?.sandbox).toBe('ok')
    expect(report.liveChecks?.sandboxDetail).toContain('exit=0')
  })

  it('returns sandbox:fail on non-zero exit', async () => {
    const report = await runDoctor(true, {
      sandboxSpawner: makeFakeSandbox({ exitCode: 1 }),
    })
    expect(report.liveChecks?.sandbox).toBe('fail')
    expect(report.liveChecks?.sandboxDetail).toContain('code 1')
  })

  it('returns sandbox:fail on timeout', async () => {
    const report = await runDoctor(true, {
      sandboxSpawner: makeFakeSandbox({ delayMs: 300 }),
      timeoutMs: { sandbox: 50 },
    })
    expect(report.liveChecks?.sandbox).toBe('fail')
    expect(report.liveChecks?.sandboxDetail).toBe('os.cli.doctor_live_timeout')
  })

  it('returns sandbox:fail when spawn throws', async () => {
    const report = await runDoctor(true, {
      sandboxSpawner: makeFakeSandbox({ throwOnSpawn: true }),
    })
    expect(report.liveChecks?.sandbox).toBe('fail')
    expect(report.liveChecks?.sandboxDetail).toContain('spawn failed')
  })

  it('returns sandbox:skipped when no spawner injected', async () => {
    const report = await runDoctor(true, {})
    expect(report.liveChecks?.sandbox).toBe('skipped')
  })

  it('CLI output contains live:sandbox line', async () => {
    const cmd = createDoctor({ sandboxSpawner: makeFakeSandbox() })
    const r = await cmd.run(['--live'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('live:sandbox')
    expect(r.stdout).toContain('exit=0')
  })
})

// ---------------------------------------------------------------------------
// Integration: both probes together
// ---------------------------------------------------------------------------

describe('doctor --live (both probes)', () => {
  it('reports ok for both when both succeed', async () => {
    const report = await runDoctor(true, {
      llmAdapter: makeFakeLlm(),
      sandboxSpawner: makeFakeSandbox(),
    })
    expect(report.liveChecks?.llm).toBe('ok')
    expect(report.liveChecks?.sandbox).toBe('ok')
    expect(report.failed).toBe(0)
  })

  it('reports 2 failures when both probes fail', async () => {
    const report = await runDoctor(true, {
      llmAdapter: makeFakeLlm({ delayMs: 300 }),
      sandboxSpawner: makeFakeSandbox({ exitCode: 2 }),
      timeoutMs: { llm: 50, sandbox: 5_000 },
    })
    expect(report.liveChecks?.llm).toBe('fail')
    expect(report.liveChecks?.sandbox).toBe('fail')
  })

  it('--live flag off skips both probes', async () => {
    // Even if adapters are injected, --live absent means no live checks
    const cmd = createDoctor({
      llmAdapter: makeFakeLlm(),
      sandboxSpawner: makeFakeSandbox(),
    })
    const r = await cmd.run([])
    expect(r.stdout).not.toContain('live:llm')
    expect(r.stdout).not.toContain('live:sandbox')
  })

  describe('--creds', () => {
    it('reports missing required keys without printing values', async () => {
      const prev = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      try {
        const r = await createDoctor().run(['--creds', '--provider', 'openai'])
        expect(r.code).toBe(1)
        const out = r.stdout + r.stderr
        expect(out).toContain('creds:openai')
        expect(out).toContain('OPENAI_API_KEY')
        expect(out).toContain('[FAIL]')
      } finally {
        if (prev !== undefined) process.env.OPENAI_API_KEY = prev
      }
    })

    it('passes when key present and never prints the value', async () => {
      const prev = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'sk-fake-XYZ'
      try {
        const r = await createDoctor().run(['--creds', '--provider', 'openai'])
        expect(r.code).toBe(0)
        expect(r.stdout).toContain('creds:openai')
        expect(r.stdout).not.toContain('sk-fake-XYZ')
      } finally {
        if (prev !== undefined) process.env.OPENAI_API_KEY = prev
        else delete process.env.OPENAI_API_KEY
      }
    })

    it('--air-gap skips cloud providers (no failure)', async () => {
      const prev = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      try {
        const r = await createDoctor().run(['--creds', '--air-gap', '--provider', 'openai'])
        expect(r.code).toBe(0)
        expect(r.stdout).toContain('skip')
      } finally {
        if (prev !== undefined) process.env.OPENAI_API_KEY = prev
      }
    })
  })
})
